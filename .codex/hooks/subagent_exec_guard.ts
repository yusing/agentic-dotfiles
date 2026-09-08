import * as path from "path";
import { deny } from "./lib/hook_response.ts";
import { handleVersion, isRecord, readEvent, runMain, writeJson } from "./lib/hook_runtime.ts";
import {
  SHELLS,
  afterOptions,
  commandSubstitutions,
  shellPayload,
  shellSegments,
  stripLeadingShellPrefix,
} from "./lib/shell_command.ts";

export const VERSION = "1.1.1";

const CONTAINER_EXECUTABLES = new Set([
  "docker",
  "docker-compose",
  "helm",
  "k3d",
  "kind",
  "kubectl",
  "minikube",
  "nerdctl",
  "podman",
  "podman-compose",
]);
// Option arity belongs to the wrapper: sudo -n/-s are flags, unlike
// nice -n and timeout -s. Consuming a flag's next word could hide the CLI.
const WRAPPER_VALUE_OPTIONS: Record<string, string> = {
  command: "",
  doas: "-C -u",
  env: "-u --unset -C --chdir",
  nice: "-n --adjustment",
  nohup: "",
  rtk: "",
  stdbuf: "-i -o -e --input --output --error",
  sudo: "-C -D -g -h -p -R -r -T -t -u --close-from --chdir --group --host --prompt --chroot --role --command-timeout --type --user",
  time: "-f -o --format --output",
  timeout: "-k -s --kill-after --signal",
  xargs: "-a -d -E -I -L -n -P -s --arg-file --delimiter --eof --replace --max-lines --max-args --max-procs --max-chars",
};
const MAX_DEPTH = 4;
export const DENIAL_REASON =
  "Container and orchestration mutations, process control, and commands not confidently " +
  "recognized as read-only inspection belong to the root agent. Read-only inspection " +
  "such as docker logs, docker ps, and kubectl get remains available. Report the exact " +
  "blocked command, why it is needed, and what a passing run would prove in your assigned " +
  "result format. Ordinary in-process checks remain available.";

// Recognize an intentionally bounded CLI subset. Unknown options are not skipped:
// their values could otherwise be mistaken for a read-only command.
function inspectionWords(args: string[], values: string, flags: string, stopAtCommand = false): string[] | undefined {
  const valueOptions = new Set(values.split(" "));
  const flagOptions = new Set(flags.split(" "));
  const words: string[] = [];
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === "--") {
      return [...words, ...args.slice(i + 1)];
    }
    if (!arg.startsWith("-")) {
      if (stopAtCommand) return args.slice(i);
      words.push(arg);
      continue;
    }
    const option = arg.split("=", 1)[0];
    if (valueOptions.has(option)) {
      if (!arg.includes("=")) {
        i += 1;
        if (i >= args.length || args[i].startsWith("-")) return undefined;
      }
    } else if (flagOptions.has(option)) {
      if (arg.includes("=") && !["true", "false"].includes(arg.slice(option.length + 1))) {
        return undefined;
      }
    } else {
      return undefined;
    }
  }
  return words;
}

function isReadOnlyInspection(executable: string, args: string[]): boolean {
  let words: string[] | undefined;
  if (["docker", "podman", "nerdctl"].includes(executable)) {
    const globals = "--context --host -H --namespace";
    const commandArgs = inspectionWords(args, globals, "", true);
    if (commandArgs === undefined || commandArgs.length === 0) return false;
    const followingLogs = commandArgs[0] === "logs";
    words = inspectionWords(commandArgs,
      globals + " --format --filter --tail --since --until --last -n" + (followingLogs ? "" : " -f"),
      "--all -a --quiet -q --no-trunc --size -s --follow --timestamps -t --details --no-stream --no-reset --latest" + (followingLogs ? " -f" : ""));
    if (words === undefined || words.length === 0) return false;
    if (["container", "image", "network", "volume"].includes(words[0])) {
      return words.length > 1 && ["ls", "inspect"].includes(words[1]);
    }
    return ["ps", "logs", "inspect", "images", "stats", "top", "version", "info"].includes(words[0]);
  }
  if (executable === "kubectl") {
    words = inspectionWords(args,
      "--context --cluster --user --kubeconfig --namespace -n --server -s --request-timeout --output -o --selector -l --field-selector --container -c --tail --since --since-time --limit-bytes --sort-by --template --chunk-size",
      "--all-namespaces -A --watch -w --watch-only --show-labels --no-headers --ignore-not-found --all-containers --follow -f --previous -p --timestamps --prefix --containers --use-protocol-buffers");
    return words !== undefined && words.length > 0 &&
      ["get", "describe", "logs", "top", "version", "api-resources", "api-versions"].includes(words[0]);
  }
  // Other orchestration CLIs remain root-owned until their command/options
  // contract is explicitly covered here and by the focused executable tests.
  return false;
}

function deniedSegment(tokens: string[], depth: number): boolean {
  if (depth > MAX_DEPTH) {
    return false;
  }
  let remaining = stripLeadingShellPrefix(tokens);
  // Unwrapping always consumes a word, so a finite chain needs no recursion
  // cap that could turn a still-visible mutation into an allow.
  while (remaining.length > 0) {
    const executable = path.basename(remaining[0]);
    const arguments_ = remaining.slice(1);
    if (CONTAINER_EXECUTABLES.has(executable)) {
      return !isReadOnlyInspection(executable, arguments_);
    }
    if (SHELLS.has(executable)) {
      const payload = shellPayload(arguments_);
      return payload !== undefined && hasContainerCommand(payload, depth + 1);
    }
    if (!(executable in WRAPPER_VALUE_OPTIONS)) return false;
    let wrapped = afterOptions(arguments_, new Set(WRAPPER_VALUE_OPTIONS[executable].split(" ")));
    wrapped = wrapped.slice(executable === "timeout" ? 1 : 0);
    remaining = stripLeadingShellPrefix(wrapped);
  }
  return false;
}

export function hasContainerCommand(command: unknown, depth = 0): boolean {
  if (typeof command !== "string" || command.trim().length === 0 || depth > MAX_DEPTH) {
    return false;
  }
  if (commandSubstitutions(command).some((substitution) => hasContainerCommand(substitution, depth + 1))) {
    return true;
  }
  return shellSegments(command).some((segment) => deniedSegment(segment, depth));
}

export function inSpawnedAgent(event: Record<string, unknown>): boolean {
  const agentType = event.agent_type;
  return typeof agentType === "string" && agentType.trim().length > 0;
}

export function responseFor(event: unknown): Record<string, unknown> | undefined {
  if (!isRecord(event) || !inSpawnedAgent(event)) {
    return undefined;
  }
  const toolInput = event.tool_input;
  if (!isRecord(toolInput)) {
    return undefined;
  }
  if (!hasContainerCommand(toolInput.command)) {
    return undefined;
  }
  return deny(DENIAL_REASON);
}

function main(): number {
  if (handleVersion(VERSION)) {
    return 0;
  }
  const event = readEvent();
  const response = responseFor(event);
  if (response !== undefined) {
    writeJson(response);
  }
  return 0;
}

runMain("subagent_exec_guard", main);

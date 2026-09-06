import * as path from "path";
import { deny } from "./lib/hook_response.ts";
import { handleVersion, isRecord, readEvent, writeJson } from "./lib/hook_runtime.ts";
import {
  SHELLS,
  afterOptions,
  commandSubstitutions,
  shellPayload,
  shellSegments,
  stripLeadingShellPrefix,
} from "./lib/shell_command.ts";

export const VERSION = "1.0.0";

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
const TRANSPARENT_WRAPPERS = new Set([
  "command",
  "doas",
  "env",
  "nice",
  "nohup",
  "rtk",
  "stdbuf",
  "sudo",
  "time",
  "timeout",
  "xargs",
]);
const WRAPPER_OPTIONS_WITH_VALUES = new Set([
  "-C",
  "-g",
  "-n",
  "-p",
  "-s",
  "-u",
  "--chdir",
  "--group",
  "--kill-after",
  "--prompt",
  "--signal",
  "--user",
]);
const MAX_DEPTH = 4;
export const DENIAL_REASON =
  "Container and orchestration commands are denied inside a spawned agent. " +
  "The root agent owns container-level and external-service validation, " +
  "because it is the only agent that can escalate to the user. Record the " +
  "exact command, why the assigned behavior needs it, and what a passing run " +
  "would prove in your result artifact, then report that blocker by returning " +
  '`"status":"blocked"` in your manifest. Focused checks that run in-process, ' +
  "such as the project's unit and package test commands, remain available.";

function deniedSegment(tokens: string[], depth: number): boolean {
  if (depth > MAX_DEPTH) {
    return false;
  }
  const remaining = stripLeadingShellPrefix(tokens);
  if (remaining.length === 0) {
    return false;
  }
  const executable = path.basename(remaining[0] ?? "");
  const arguments_ = remaining.slice(1);
  if (CONTAINER_EXECUTABLES.has(executable)) {
    return true;
  }
  if (SHELLS.has(executable)) {
    const payload = shellPayload(arguments_);
    return payload !== undefined && hasContainerCommand(payload, depth + 1);
  }
  if (TRANSPARENT_WRAPPERS.has(executable)) {
    let wrapped = afterOptions(arguments_, WRAPPER_OPTIONS_WITH_VALUES);
    wrapped = wrapped.slice(executable === "timeout" ? 1 : 0);
    return wrapped.length > 0 && deniedSegment(wrapped, depth + 1);
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

process.exit(main());

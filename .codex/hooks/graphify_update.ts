import * as fs from "fs";
import * as path from "path";
import { asString, handleVersion, isRecord, readEvent, runCommand, runMain, writeJson } from "./lib/hook_runtime.ts";

export const VERSION = "1.4.0";

// graphify-report --queue writes this record when a background refresh fails and
// removes it after a success; keep the name in step with graphify-report.ts.
const FAILURE_RECORD = path.join("graphify-out", ".graphify-report.error");

// Start the refresh in its own session so the tool call never waits for Graphify
// and the client does not reap it with the hook. graphify-report coalesces bursts.
const START_REFRESH = 'set -- graphify-report --update --queue "$1"; ' +
  'if command -v setsid >/dev/null 2>&1; then set -- setsid "$@"; fi; ' +
  'nohup "$@" </dev/null >/dev/null 2>&1 &';

// Bash completions carry the original command, including a completed exec poll.
// Only recognize simple literal inspection calls; shell syntax and unknown tools
// take the normal refresh path. Never infer "no writes" from stdout or exit status.
function inspection(tool: unknown, input: Record<string, unknown>): boolean {
  if (tool !== "Bash" && tool !== "exec_command" && tool !== "functions.exec_command") return false;
  const cmd = asString(input.command) ?? asString(input.cmd);
  if (!cmd || /[^a-zA-Z0-9_.:/, @="'?-]/.test(cmd)) return false;
  return /^(?:pwd|(?:cat|ls|mcat|inspect_file)(?: +[^ ]+)*|graphify +(?:query|path|explain) +[^-].*)$/.test(cmd.trim()) &&
    !/(?:^| )--?output(?:=| |$)/.test(cmd);
}

function fromAntigravity(event: unknown): unknown {
  if (!isRecord(event) || !isRecord(event.toolCall)) return null;
  const { name, args } = event.toolCall;
  if (!isRecord(args)) return null;
  if (name === "run_command") {
    return {
      hook_event_name: "PostToolUse",
      cwd: args.Cwd,
      tool_name: "Bash",
      tool_input: { command: args.CommandLine },
    };
  }
  if (name === "write_to_file" || name === "replace_file_content" ||
      name === "multi_replace_file_content") {
    const target = asString(args.TargetFile);
    if (target && path.isAbsolute(target)) {
      return {
        hook_event_name: "PostToolUse",
        cwd: path.dirname(target),
        tool_name: "Edit",
        tool_input: { file_path: target },
      };
    }
  }
  return null;
}

function fromDevin(event: unknown): unknown {
  if (!isRecord(event) || event.hook_event_name !== "PostToolUse") return null;
  const envDir = process.env.DEVIN_PROJECT_DIR;
  const cwd = asString(event.cwd) ?? (envDir && path.isAbsolute(envDir) ? envDir : process.cwd());
  const input = isRecord(event.tool_input) ? event.tool_input : {};
  const toolInput: Record<string, unknown> = {};
  const command = asString(input.command);
  if (command) toolInput.command = command;
  const workdir = asString(input.workdir) ?? asString(input.cwd);
  if (workdir) toolInput.workdir = workdir;
  const file = asString(input.file_path) ?? asString(input.notebook_path);
  if (file) toolInput.file_path = file;
  return {
    hook_event_name: "PostToolUse",
    cwd,
    tool_name: event.tool_name === "exec" ? "Bash" : event.tool_name,
    tool_input: toolInput,
  };
}

function refresh(event: unknown): number {
  if (!isRecord(event) || event.hook_event_name !== "PostToolUse") return 0;
  const cwd = asString(event.cwd);
  if (!cwd || !path.isAbsolute(cwd)) return 0;
  const input = isRecord(event.tool_input) ? event.tool_input : {};
  const workdir = asString(input.workdir) ?? asString(input.cwd);
  const file = asString(input.file_path);
  let directory = file ? path.dirname(path.resolve(cwd, file)) : path.resolve(cwd, workdir ?? ".");
  while (true) {
    const gitRoot = fs.existsSync(path.join(directory, ".git"));
    if (gitRoot || fs.existsSync(path.join(directory, "graphify-out", "graph.json"))) {
      const record = path.join(directory, FAILURE_RECORD);
      let failure = "";
      if (fs.existsSync(record)) {
        failure = fs.readFileSync(record, "utf8");
        fs.unlinkSync(record);
      }
      if (!inspection(event.tool_name, input)) {
        const started = runCommand(["sh", "-c", START_REFRESH, "sh", directory], { cwd: directory });
        if (started.status !== 0) {
          process.stderr.write(started.stderr);
          process.stderr.write("Graphify refresh could not start; use source navigation until the graph is refreshed.\n");
          return 1;
        }
      }
      if (failure) {
        process.stderr.write(failure);
        process.stderr.write("Graphify update/report failed; use source navigation until the graph is refreshed.\n");
        return 1;
      }
      return 0;
    }
    const parent = path.dirname(directory);
    if (parent === directory) return 0;
    directory = parent;
  }
}

function main(): number {
  if (handleVersion(VERSION)) return 0;
  const event = readEvent();
  if (process.argv.includes("--antigravity")) {
    const status = refresh(fromAntigravity(event));
    writeJson({});
    return status;
  }
  if (process.argv.includes("--devin")) {
    return refresh(fromDevin(event));
  }
  return refresh(event);
}

runMain("graphify_update", main);

import { createHash } from "crypto";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { digest, eventSessionId, pruneOldEntries } from "./lib/session_scope.ts";
import { withLockedDir } from "./lib/locked_state.ts";
import { commandSubstitutions, isSeparatorToken, shellSegments, shellTokens, stripLeadingShellPrefix } from "./lib/shell_command.ts";
import { isGeneratedGoFile } from "./generated_code_guard.ts";
import { responseFor as generatedGuardResponse } from "./generated_code_guard.ts";
import { responseFor as subagentGuardResponse } from "./subagent_exec_guard.ts";
import { asString, at, handleVersion, isRecord, readEvent, runCommand, runMain, writeJson } from "./lib/hook_runtime.ts";

export const VERSION = "1.0.2";

type Snapshot = Record<string, string>;
type Baseline = { files: Snapshot; findings: Record<string, string[]> };
type Finding = { signature: string; display: string };
const SKIP = new Set([".git", "vendor", "node_modules", ".cache", ".codex"]);

function projectRoot(cwd: string): string | undefined {
  const selectedWorkspace = process.env.GOWORK;
  if (selectedWorkspace === "off") {
    let current = path.resolve(cwd);
    while (true) {
      if (fs.existsSync(path.join(current, "go.mod"))) return current;
      const parent = path.dirname(current);
      if (parent === current) return undefined;
      current = parent;
    }
  }
  if (selectedWorkspace && selectedWorkspace !== "auto") {
    const workspace = path.resolve(cwd, selectedWorkspace);
    if (fs.existsSync(workspace)) return path.dirname(workspace);
  }
  let current = path.resolve(cwd);
  let nearestModule: string | undefined;
  while (true) {
    if (fs.existsSync(path.join(current, "go.work"))) return current;
    if (!nearestModule && fs.existsSync(path.join(current, "go.mod"))) nearestModule = current;
    const parent = path.dirname(current);
    if (parent === current) return nearestModule;
    current = parent;
  }
}

function workspaceFile(root: string): string {
  const selected = process.env.GOWORK;
  if (selected && selected !== "auto" && selected !== "off") {
    const absolute = path.resolve(selected);
    if (path.dirname(absolute) === root) return absolute;
  }
  return path.join(root, "go.work");
}

function stateDir(event: Record<string, unknown>, root: string): string | undefined {
  const session = eventSessionId(event);
  return session === undefined ? undefined : path.join(os.tmpdir(), "codex-go-quality", digest(session, root));
}

function potentialWrite(event: Record<string, unknown>): boolean {
  if (createsGoProject(event)) return true;
  const input = event.tool_input;
  if (event.tool_name === "Bash") {
    const command = isRecord(input) ? asString(input.command) : undefined;
    return command === undefined || !isReadOnlyCommand(command, 0);
  }
  return isRecord(input) && /\.go(?![\w.])|go\.(?:mod|work)\b/.test(JSON.stringify(input));
}

// Read-only shell commands skip the writer gate and source snapshots. The
// subset is deliberately small: anything unrecognized is a potential writer.
const READ_ONLY_EXECUTABLES = new Set([
  "basename", "cat", "cd", "cmp", "column", "date", "df", "diff", "dirname", "du", "echo",
  "fd", "file", "grep", "head", "id", "jq", "less", "ls", "nl", "pgrep", "printenv", "printf",
  "ps", "pwd", "readlink", "realpath", "rg", "sleep", "stat", "tail", "tree", "true", "type",
  "uname", "uniq", "wc", "which", "whoami",
]);
const READ_ONLY_GIT = new Set([
  "blame", "cat-file", "describe", "diff", "grep", "log", "ls-files", "ls-tree", "rev-parse",
  "shortlog", "show", "status",
]);
const READ_ONLY_GO = new Set(["doc", "help", "list", "version"]);
const FIND_WRITES = new Set(["-delete", "-exec", "-execdir", "-fls", "-fprint", "-fprint0", "-fprintf", "-ok", "-okdir"]);

const WRAPPERS = new Set(["rtk", "command", "time", "nice", "nohup"]);

function unwrapped(segment: string[]): string[] {
  let tokens = stripLeadingShellPrefix(segment);
  while (tokens.length > 0 && WRAPPERS.has(path.basename(tokens[0]))) {
    tokens = stripLeadingShellPrefix(tokens.slice(1));
  }
  return tokens;
}

function isReadOnlySegment(segment: string[]): boolean {
  const tokens = unwrapped(segment);
  if (tokens.length === 0) return true;
  const executable = path.basename(tokens[0]);
  const args = tokens.slice(1);
  if (READ_ONLY_EXECUTABLES.has(executable)) return true;
  if (executable === "find") return !args.some((arg) => FIND_WRITES.has(arg));
  if (executable === "sed") {
    const scripts = args.filter((arg) => !arg.startsWith("-"));
    return args.includes("-n") && !args.some((arg) => /^-[^-]*i|^--in-place/.test(arg)) &&
      scripts.length > 0 && /^[\d,$;\s]*p[\d,$;p\s]*$/.test(scripts[0]);
  }
  if (executable === "git") {
    let index = 0;
    while (index < args.length && args[index].startsWith("-")) index += args[index] === "-C" || args[index] === "-c" ? 2 : 1;
    return index < args.length && READ_ONLY_GIT.has(args[index]) &&
      !args.some((arg) => arg.startsWith("--output") || arg === "-o");
  }
  if (executable === "go") {
    if (args[0] === "env") return !args.some((arg) => arg === "-w" || arg === "-u");
    return args.length > 0 && READ_ONLY_GO.has(args[0]);
  }
  return false;
}

// Blank quoted text so a quoted ">" is not mistaken for a redirection.
function unquoted(command: string): string {
  let result = "";
  let quote = "";
  for (let index = 0; index < command.length; index += 1) {
    const character = command[index];
    if (quote === "'" ? character === "'" : quote === "\"" ? character === "\"" && command[index - 1] !== "\\" : false) {
      quote = "";
    } else if (!quote && (character === "'" || character === "\"") && command[index - 1] !== "\\") {
      quote = character;
    } else if (!quote) {
      result += character;
      continue;
    }
    result += " ";
  }
  return result;
}

function isReadOnlyCommand(command: string, depth: number): boolean {
  if (depth > 3) return false;
  const withoutSafeRedirects = command.replace(/\d*>&\d+/g, "").replace(/(?:&|\d)?>>?\s*\/dev\/null\b/g, "");
  if (unquoted(withoutSafeRedirects).includes(">")) return false;
  try {
    if (!commandSubstitutions(command).every((inner) => isReadOnlyCommand(inner, depth + 1))) return false;
    return shellSegments(withoutSafeRedirects).every(isReadOnlySegment);
  } catch {
    return false;
  }
}

const MANIFESTS = new Set(["go.mod", "go.work"]);

// Manifest paths a tool may write, resolved against the directory each shell
// segment runs in. An unknown directory or `$` expansion yields no target.
function manifestTargets(event: Record<string, unknown>, cwd: string): string[] {
  const input = event.tool_input;
  if (!isRecord(input)) return [];
  const targets: string[] = [];
  const add = (directory: string | undefined, raw: string): void => {
    if (directory === undefined || raw.includes("$") || !MANIFESTS.has(path.basename(raw))) return;
    targets.push(path.resolve(directory, raw.startsWith("~/") ? path.join(os.homedir(), raw.slice(2)) : raw));
  };
  const file = asString(input.file_path) ?? asString(input.path);
  if (file) add(cwd, file);
  const command = asString(input.command) ?? "";
  for (const match of command.matchAll(/^\*\*\* (?:Add|Update) File: (.+?)\r?$/gm)) add(cwd, match[1]);
  if (event.tool_name !== "Bash") return targets;
  // Tokens lose their quotes, so a quoted ">" is ruled out on the raw text.
  const redirects = unquoted(command).includes(">");
  let directory: string | undefined = cwd;
  try {
    for (const segment of shellSegments(command)) {
      const tokens = unwrapped(segment);
      for (let index = 0; redirects && index < tokens.length; index += 1) {
        const token = tokens[index];
        const redirect = token.lastIndexOf(">");
        if (redirect < 0 || /[-=]>/.test(token)) continue;
        add(directory, redirect === token.length - 1 ? at(tokens, index + 1) ?? "" : token.slice(redirect + 1));
      }
      // scriptc aborts on an out-of-bounds index, so reads go through `at`.
      const executable = at(tokens, 0);
      const args = tokens.slice(1);
      if (executable === "cd") {
        const target = at(args, 0);
        directory = directory !== undefined && target && !target.includes("$") && target !== "-" && !target.startsWith("~")
          ? path.resolve(directory, target)
          : undefined;
      } else if (executable === "go" && at(args, 1) === "init" && (at(args, 0) === "mod" || at(args, 0) === "work")) {
        add(directory, `go.${at(args, 0)}`);
      }
    }
  } catch {
    // An unparseable command names no manifest.
  }
  return targets;
}

// Only a manifest at the cwd or an ancestor makes the cwd a Go project; one
// written elsewhere, such as a temporary fixture, does not.
function createsGoProject(event: Record<string, unknown>): boolean {
  const cwd = asString(event.cwd);
  if (!cwd) return false;
  return manifestTargets(event, cwd).some((target) => {
    const relative = path.relative(path.dirname(target), path.resolve(cwd));
    return !relative.startsWith("..") && !path.isAbsolute(relative);
  });
}

function prospectiveModules(event: Record<string, unknown>, root: string): string[] {
  const input = event.tool_input;
  const command = isRecord(input) ? asString(input.command) ?? "" : "";
  const content = isRecord(input) ? asString(input.content) ?? "" : "";
  const candidates: string[] = [];
  const add = (raw: string): void => {
    const candidate = raw.replace(/^[+('"`]+|[)'"`,]+$/g, "");
    if (!candidate || candidate.startsWith("-")) return;
    const module = path.resolve(root, candidate);
    if (fs.existsSync(path.join(module, "go.mod"))) candidates.push(module);
  };
  const tokens = shellTokens(command);
  for (let index = 0; index + 2 < tokens.length; index += 1) {
    if (tokens[index] !== "go" || tokens[index + 1] !== "work" ||
        (tokens[index + 2] !== "init" && tokens[index + 2] !== "use")) continue;
    for (let next = index + 3; next < tokens.length && !isSeparatorToken(tokens[next]); next += 1) add(tokens[next]);
  }
  for (const line of `${command}\n${content}`.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed.startsWith("+") && !trimmed.startsWith("use") && !trimmed.startsWith("./") && !trimmed.startsWith("../")) continue;
    for (const token of shellTokens(trimmed.startsWith("+") ? trimmed.slice(1) : trimmed)) add(token);
  }
  return [...new Set(candidates)];
}

// Claude rejects hookSpecificOutput naming another event, so a failed-tool
// reconcile answers as PostToolUseFailure.
function resultEvent(event: Record<string, unknown>): string {
  return event.hook_event_name === "PostToolUseFailure" ? "PostToolUseFailure" : "PostToolUse";
}

function toolId(event: Record<string, unknown>): string {
  return asString(event.tool_use_id) ?? digest(eventSessionId(event) ?? "", asString(event.tool_name) ?? "tool", JSON.stringify(event.tool_input ?? ""));
}

function writerGate(root: string): string {
  return path.join(os.tmpdir(), "codex-go-writers", digest(root));
}

function readGate(gate: string): Record<string, unknown> | undefined {
  try {
    const record = JSON.parse(fs.readFileSync(path.join(gate, "active.json"), "utf8")) as Record<string, unknown>;
    return isRecord(record) ? record : undefined;
  } catch {
    return undefined;
  }
}

function writeGate(gate: string, record: Record<string, unknown>): void {
  const file = path.join(gate, "active.json");
  const temporary = `${file}.${process.pid}`;
  fs.writeFileSync(temporary, JSON.stringify(record), { mode: 0o600 });
  fs.renameSync(temporary, file);
}

// The gate serializes writers only to keep per-tool diff attribution clean.
// Contention never denies a tool: Codex emits no PostToolUse for failed,
// rejected, interrupted, or still-running tools, so a holder may never
// release. A same-session non-shell holder has finished, because Codex runs
// those tools exclusively; it is reconciled and replaced. Other holders get a
// short wait while fresh, then the tool proceeds without the gate.
function acquireWriter(event: Record<string, unknown>, root: string): boolean {
  const gate = writerGate(root);
  fs.mkdirSync(path.dirname(gate), { recursive: true, mode: 0o700 });
  const id = toolId(event);
  const session = eventSessionId(event) ?? "";
  const deadline = Date.now() + 2000;
  while (true) {
    let finished: Record<string, unknown> | undefined;
    let waitable = false;
    const acquired = withLockedDir(gate, () => {
      const active = readGate(gate);
      if (active && active.id === id) return true;
      if (active) {
        const holder = isRecord(active.event) ? active.event : undefined;
        const toolName = holder ? asString(holder.tool_name) : undefined;
        if (holder && toolName && toolName !== "Bash" && active.session === session) {
          finished = holder;
        } else {
          const since = typeof active.since === "number" ? active.since : 0;
          waitable = Date.now() - since < 60000;
          return false;
        }
      }
      const storedEvent: Record<string, unknown> = {
        cwd: event.cwd, session_id: event.session_id,
        tool_name: event.tool_name, tool_input: event.tool_input,
        tool_use_id: event.tool_use_id,
      };
      writeGate(gate, { id, session, since: Date.now(), event: storedEvent });
      return true;
    });
    if (finished) reconcileWriter(finished, root);
    if (acquired) return true;
    if (!waitable || Date.now() >= deadline) return false;
    runCommand(["sleep", "0.1"]);
  }
}

function reconcileWriter(holder: Record<string, unknown>, root: string): string | undefined {
  const directory = stateDir(holder, root);
  if (!directory) return undefined;
  try {
    const response = projectRoot(asString(holder.cwd) ?? root)
      ? postEdit(holder, root, directory)
      : postPendingEdit(holder, root, directory);
    const hook = response?.hookSpecificOutput;
    return isRecord(hook) ? asString(hook.additionalContext) : undefined;
  } catch {
    return undefined;
  }
}

function recoverStoppedWriter(cwd: string): string {
  const root = projectRoot(cwd) ?? path.resolve(cwd);
  const gate = writerGate(root);
  if (!fs.existsSync(gate)) return "No Go writer gate exists.";
  let unreadable = false;
  const event = withLockedDir(gate, (): Record<string, unknown> | undefined => {
    const file = path.join(gate, "active.json");
    if (!fs.existsSync(file)) return undefined;
    const record = readGate(gate);
    if (record && isRecord(record.event)) return record.event;
    // A record without its event cannot be reconciled; the caller confirmed it stopped.
    fs.unlinkSync(file);
    unreadable = true;
    return undefined;
  });
  if (unreadable) return "Go writer gate released without a recorded tool event; its edits were not reconciled.";
  if (!event) return "No active Go writer exists.";
  try {
    return reconcileWriter(event, root) ?? "Go writer gate released; its edits were reconciled.";
  } finally {
    releaseWriter(event, root);
  }
}

// At Stop the turn is over, so every writer this session still holds is
// reconciled and released, including shell commands that never posted.
function reconcileFailedWriter(event: Record<string, unknown>, root: string): string | undefined {
  const session = eventSessionId(event);
  if (!session) return;
  const gate = writerGate(root);
  if (!fs.existsSync(gate)) return;
  const active = withLockedDir(gate, () => readGate(gate));
  if (!active || active.session !== session || !isRecord(active.event)) return undefined;
  const failed = active.event;
  try {
    return reconcileWriter(failed, root);
  } finally {
    releaseWriter(failed, root);
  }
}

function releaseWriter(event: Record<string, unknown>, cwd: string): void {
  const id = toolId(event);
  let current = path.resolve(cwd);
  while (true) {
    const gate = writerGate(current);
    if (fs.existsSync(gate)) {
      withLockedDir(gate, () => {
        const active = readGate(gate);
        if (active && active.id === id) fs.unlinkSync(path.join(gate, "active.json"));
      });
    }
    const parent = path.dirname(current);
    if (parent === current) break;
    current = parent;
  }
}

function moduleRoots(root: string): string[] {
  if (process.env.GOWORK !== "off" && fs.existsSync(workspaceFile(root))) {
    const result = runCommand(["go", "work", "edit", "-json"], { cwd: root });
    if (result.status === 0) {
      try {
        const work = JSON.parse(result.stdout) as unknown;
        if (isRecord(work) && Array.isArray(work.Use)) {
          const modules: string[] = [];
          for (const entry of work.Use) {
            if (!isRecord(entry) || typeof entry.DiskPath !== "string") continue;
            const module = path.resolve(root, entry.DiskPath);
            if (fs.existsSync(path.join(module, "go.mod"))) modules.push(module);
          }
          if (modules.length > 0) return [...new Set(modules)].sort((a, b) => b.length - a.length);
        }
      } catch {
        // Fall back to the root module when a workspace file cannot be parsed.
      }
    }
  }
  return fs.existsSync(path.join(root, "go.mod")) ? [root] : [];
}

function moduleCache(): string {
  const configured = process.env.GOMODCACHE;
  if (configured) return path.resolve(configured);
  const gopath = (process.env.GOPATH ?? "").split(path.delimiter)[0] || path.join(os.homedir(), "go");
  return path.join(gopath, "pkg", "mod");
}

function snapshot(root: string, roots: string[] = moduleRoots(root)): Snapshot {
  const result: Snapshot = {};
  const cache = moduleCache();
  // Unreadable directories and files removed mid-walk are not sources the
  // agent can edit; skipping them keeps one permission error from failing
  // every hook in the project.
  const visit = (directory: string): void => {
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(directory, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const full = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        if (!SKIP.has(entry.name) && full !== cache) visit(full);
      } else if (entry.isFile() && entry.name.endsWith(".go")) {
        try {
          result[path.relative(root, full)] = createHash("sha256").update(fs.readFileSync(full)).digest("hex");
        } catch {
          // Removed or unreadable during the walk.
        }
      }
    }
  };
  for (const module of roots) visit(module);
  return result;
}

function sourceSnapshot(root: string, directory: string): Snapshot {
  return fs.existsSync(path.join(directory, "project-absent-at-baseline"))
    ? snapshot(root, [root, ...moduleRoots(root)])
    : snapshot(root);
}

function changed(before: Snapshot, after: Snapshot): string[] {
  const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
  return [...keys].filter((key) => before[key] !== after[key]).sort();
}

function targetSupportsFix(root: string): boolean {
  const manifest = fs.existsSync(path.join(root, "go.mod")) ? "go.mod" : "go.work";
  const source = fs.readFileSync(path.join(root, manifest), "utf8");
  const target = /^go (\d+)\.(\d+)/m.exec(source);
  return target !== null && (Number(target[1]) > 1 || Number(target[2]) >= 26);
}

function goSupportsFix(root: string): boolean {
  if (!targetSupportsFix(root)) return false;
  const result = runCommand(["go", "version"], { cwd: root });
  const match = /go(\d+)\.(\d+)/.exec(result.stdout);
  return result.status === 0 && match !== null &&
    (Number(match[1]) > 1 || Number(match[2]) >= 26);
}

function findings(tool: string, output: string): Finding[] {
  if (tool === "go fix") {
    let file = "";
    const lines: Finding[] = [];
    for (const line of output.split("\n")) {
      if (line.startsWith("+++ ")) file = line.slice(4).replace(/^b\//, "");
      else if ((line.startsWith("+") || line.startsWith("-")) && !line.startsWith("+++ ") && !line.startsWith("--- ")) {
        lines.push({ signature: `${file}: ${line}`, display: `${file}: ${line}` });
      }
    }
    return lines;
  }
  if (tool === "golangci-lint") {
    try {
      const parsed = JSON.parse(output) as unknown;
      if (!isRecord(parsed) || !Array.isArray(parsed.Issues)) return [];
      const issues: Finding[] = [];
      for (const issue of parsed.Issues) {
        if (!isRecord(issue) || !isRecord(issue.Pos)) continue;
        const file = asString(issue.Pos.Filename) ?? "?";
        const line = typeof issue.Pos.Line === "number" ? issue.Pos.Line : 0;
        const linter = asString(issue.FromLinter) ?? "lint";
        const message = asString(issue.Text) ?? "unknown issue";
        issues.push({
          signature: `${file}: ${linter}: ${message}`,
          display: `${file}:${line}: ${message} (${linter})`,
        });
      }
      return issues;
    } catch {
      return [];
    }
  }
  const lines: Finding[] = [];
  for (const line of output.split("\n")) {
    const trimmed = line.trim();
    if (!/\.go:\d+/.test(trimmed)) continue;
    lines.push({
      signature: trimmed.replace(/:(\d+)(?::\d+)?(?=[: ])/g, ":#"),
      display: trimmed,
    });
  }
  return lines;
}

function runChecks(root: string, modules: string[] = moduleRoots(root)): Record<string, Finding[]> {
  const result: Record<string, Finding[]> = {};
  for (const module of modules) {
    const prefix = module === root ? "" : `${path.relative(root, module)}/`;
    const checks: [string, string[]][] = [];
    if (goSupportsFix(module)) checks.push(["go fix", ["go", "fix", "-diff", "./..."]]);
    const lintVersion = runCommand(["golangci-lint", "version"], { cwd: module });
    if (!lintVersion.error) {
      const major = /version (\d+)/.exec(lintVersion.stdout)?.[1];
      const lint = major === "1"
        ? ["golangci-lint", "run", "--out-format=json", "./..."]
        : ["golangci-lint", "run", "--show-stats=false", "--output.text.path", "stderr", "--output.json.path", "stdout", "./..."];
      checks.push(["golangci-lint", lint]);
    }
    checks.push(["deadcode", ["deadcode", "./..."]]);
    for (const [name, command] of checks) {
      const run = runCommand(command, { cwd: module });
      if (run.error && run.error.message.includes("ENOENT")) continue;
      const output = name === "golangci-lint" ? run.stdout.trim() : `${run.stdout}\n${run.stderr}`.trim();
      const key = `${prefix}${name}`;
      result[key] = findings(name, output);
      if (run.status !== 0 && result[key].length === 0) {
        const failure = `${name} exited ${run.status}: ${run.stderr.trim().split("\n")[0] ?? "no diagnostics"}`;
        result[key] = [{ signature: failure, display: failure }];
      }
    }
  }
  return result;
}

function writeBaseline(file: string, value: Baseline | string[]): void {
  const temporary = `${file}.${process.pid}`;
  fs.writeFileSync(temporary, JSON.stringify(value), { mode: 0o600 });
  fs.renameSync(temporary, file);
}

function snapshotCopyPath(directory: string, relative: string): string {
  return path.join(directory, "sources", digest(relative));
}

function saveWorking(root: string, directory: string, files: Snapshot, previous: Snapshot = {}): void {
  const copies = path.join(directory, "sources");
  fs.mkdirSync(copies, { recursive: true, mode: 0o700 });
  for (const relative of changed(previous, files)) {
    const copy = snapshotCopyPath(directory, relative);
    const source = path.join(root, relative);
    if (files[relative] !== undefined && fs.existsSync(source)) {
      fs.copyFileSync(source, copy);
      fs.chmodSync(copy, 0o600);
    } else if (fs.existsSync(copy)) {
      fs.unlinkSync(copy);
    }
  }
  writeBaseline(path.join(directory, "working.json"), { files, findings: {} });
}

function workingFiles(directory: string): Snapshot {
  try {
    const working = JSON.parse(fs.readFileSync(path.join(directory, "working.json"), "utf8")) as Baseline;
    return working.files;
  } catch {
    return {};
  }
}

function diffStage(root: string, directory: string, before: Snapshot, after: Snapshot, command: string): string {
  const paths = changed(before, after);
  if (paths.length === 0) return "";
  const sections = [`# command: ${command}\n`];
  for (const relative of paths) {
    const oldFile = before[relative] === undefined ? "/dev/null" : snapshotCopyPath(directory, relative);
    const newFile = after[relative] === undefined ? "/dev/null" : path.join(root, relative);
    const diff = runCommand(["diff", "-u", "--label", `a/${relative}`, "--label", `b/${relative}`, oldFile, newFile], { cwd: root });
    sections.push(diff.stdout || `# ${relative}: changed (diff unavailable: ${diff.stderr.trim()})\n`);
  }
  saveWorking(root, directory, after, before);
  return sections.join("");
}

function baseline(root: string, directory: string): void {
  fs.mkdirSync(path.dirname(directory), { recursive: true, mode: 0o700 });
  pruneOldEntries(path.dirname(directory));
  fs.mkdirSync(path.dirname(writerGate(root)), { recursive: true, mode: 0o700 });
  pruneOldEntries(path.dirname(writerGate(root)));
  withLockedDir(directory, () => {
    const file = path.join(directory, "baseline.json");
    if (fs.existsSync(file)) return;
    const files = snapshot(root);
    const recorded = runChecks(root);
    const signatures: Record<string, string[]> = {};
    for (const [tool, lines] of Object.entries(recorded)) signatures[tool] = lines.map((line) => line.signature);
    saveWorking(root, directory, files);
    writeBaseline(file, { files, findings: signatures });
  });
}

function refreshWorking(root: string, directory: string): void {
  withLockedDir(directory, () => {
    const before = workingFiles(directory);
    const current = sourceSnapshot(root, directory);
    if (changed(before, current).length > 0) saveWorking(root, directory, current, before);
  });
}

function postPendingEdit(event: Record<string, unknown>, root: string, directory: string): Record<string, unknown> | undefined {
  if (!potentialWrite(event) || !fs.existsSync(path.join(directory, "working.json"))) return undefined;
  return withLockedDir(directory, () => {
    const before = workingFiles(directory);
    const after = snapshot(root, [root]);
    const edited = changed(before, after);
    if (edited.length === 0) return undefined;
    const toolName = asString(event.tool_name) ?? "tool";
    const commandInput = isRecord(event.tool_input) ? asString(event.tool_input.command) : undefined;
    const sourceCommand = commandInput && toolName === "Bash" ? JSON.stringify(commandInput) : toolName;
    const report = `# tool_use_id: ${toolId(event)}\n${diffStage(root, directory, before, after, sourceCommand)}`;
    const reportsDir = path.join(directory, "reports");
    fs.mkdirSync(reportsDir, { recursive: true, mode: 0o700 });
    const artifact = path.join(reportsDir, `${digest(toolId(event))}.diff`);
    fs.writeFileSync(artifact, report, { mode: 0o600 });
    // The report keeps attribution; with no Go project nothing ran, so the
    // model is told nothing.
    return undefined;
  });
}

function postEdit(event: Record<string, unknown>, root: string, directory: string): Record<string, unknown> | undefined {
  if (!potentialWrite(event)) return undefined;
  return withLockedDir(directory, () => {
    const workingFile = path.join(directory, "working.json");
    if (!fs.existsSync(workingFile)) return undefined;
    const before = workingFiles(directory);
    const firstToolMarker = path.join(directory, "first-project-tool");
    const firstProjectTool = fs.existsSync(firstToolMarker) &&
      fs.readFileSync(firstToolMarker, "utf8") === toolId(event);
    if (firstProjectTool) fs.unlinkSync(firstToolMarker);
    const capture = (): Snapshot => firstProjectTool
      ? snapshot(root, [root, ...prospectiveModules(event, root)])
      : sourceSnapshot(root, directory);
    const afterTool = capture();
    const edited = changed(before, afterTool);
    if (edited.length === 0) return undefined;
    const baselineFile = path.join(directory, "baseline.json");
    if (!fs.existsSync(baselineFile)) writeBaseline(baselineFile, { files: {}, findings: {} });
    const marker = path.join(directory, "edited");
    const descriptor = fs.openSync(marker, "a");
    fs.chmodSync(marker, 0o600);
    fs.closeSync(descriptor);
    const toolName = asString(event.tool_name) ?? "tool";
    const toolUseId = toolId(event);
    const commandInput = isRecord(event.tool_input) ? asString(event.tool_input.command) : undefined;
    const sourceCommand = commandInput && toolName === "Bash" ? JSON.stringify(commandInput) : toolName;
    const report: string[] = [`# tool_use_id: ${toolUseId}\n`];
    report.push(diffStage(root, directory, before, afterTool, sourceCommand));
    let current = afterTool;
    // Earlier edits whose fixes waited for their package to build join this
    // tool's files, so repairing the build also fixes them.
    const pendingBefore = readPending(directory);
    const targets = [...new Set([...edited, ...pendingBefore])].filter((relative) => current[relative] !== undefined)
      .map((relative) => path.join(root, relative)).filter((target) => !isGeneratedGoFile(target));
    const pending = new Set<string>();
    // The model's view of each file is what its tool wrote.
    const toolOutput = new Map<string, string>();
    for (const target of targets) {
      try {
        toolOutput.set(path.relative(root, target), fs.readFileSync(target, "utf8"));
      } catch {
        // Removed or unreadable since the snapshot.
      }
    }
    const packages = new Set<string>();
    const fixModules = moduleRoots(root).filter((module) => goSupportsFix(module));
    for (const target of targets) {
      for (const module of fixModules) {
        if (target.startsWith(`${module}${path.sep}`)) {
          packages.add(`${module}\0${path.dirname(target)}`);
          break;
        }
      }
    }
    const errors: string[] = [];
    for (const entry of packages) {
      const separator = entry.indexOf("\0");
      const module = entry.slice(0, separator);
      const packageDir = entry.slice(separator + 1);
      const packageArg = packageDir === module ? "." : `./${path.relative(module, packageDir)}`;
      const command = ["go", "fix", packageArg];
      // go fix rewrites whole packages; keep its edits only in files this tool
      // changed. Rewriting untouched siblings would reapply after every revert.
      const siblings = new Map<string, string>();
      for (const relative of Object.keys(current)) {
        const source = path.join(root, relative);
        if (path.dirname(source) !== packageDir || targets.includes(source)) continue;
        try {
          siblings.set(relative, fs.readFileSync(source, "utf8"));
        } catch {
          // Removed or unreadable since the snapshot.
        }
      }
      const result = runCommand(command, { cwd: module });
      if (result.status !== 0) {
        // A package that does not build yet is retried after a later edit;
        // Stop reports whatever is still unfixed.
        if (result.stderr.split("\n").some(sourceDiagnostic)) {
          for (const target of targets) if (path.dirname(target) === packageDir) pending.add(path.relative(root, target));
        } else {
          errors.push(`go fix ${packageArg}: ${failureLine(result.stderr)}`);
        }
      }
      for (const [relative, original] of siblings) {
        const source = path.join(root, relative);
        if (fs.existsSync(source) && fs.readFileSync(source, "utf8") === original) continue;
        fs.writeFileSync(source, original);
        if (isGeneratedGoFile(source)) errors.push(`Restored generated file after go fix: ${relative}`);
      }
      const afterFix = capture();
      report.push(diffStage(root, directory, current, afterFix, `go fix ${packageArg}`));
      current = afterFix;
    }
    const formatTargets = [...new Set([...changed(before, current), ...pendingBefore])]
      .filter((relative) => current[relative] !== undefined)
      .map((relative) => path.join(root, relative)).filter((target) => !isGeneratedGoFile(target));
    if (formatTargets.length > 0) {
      const formatted = runCommand(["gofmt", "-w", ...formatTargets], { cwd: root });
      if (formatted.status !== 0) {
        // gofmt formats every file it can parse; one mid-edit is retried later.
        const lines = formatted.stderr.split("\n").map((line) => line.trim()).filter(Boolean);
        for (const target of formatTargets) {
          const relative = path.relative(root, target);
          if (lines.some((line) => line.startsWith(`${target}:`) || line.startsWith(`${relative}:`))) pending.add(relative);
        }
        const other = lines.filter((line) => !sourceDiagnostic(line));
        if (other.length > 0 || lines.length === 0) errors.push(`gofmt: ${other[0] ?? "failed"}`);
      }
      const afterFormat = capture();
      report.push(diffStage(root, directory, current, afterFormat, `gofmt -w ${formatTargets.map((target) => path.relative(root, target)).join(" ")}`));
      current = afterFormat;
    }
    writePending(directory, pending);
    const reportsDir = path.join(directory, "reports");
    fs.mkdirSync(reportsDir, { recursive: true, mode: 0o700 });
    const artifact = path.join(reportsDir, `${digest(toolUseId)}.diff`);
    fs.writeFileSync(artifact, report.join(""), { mode: 0o600 });
    // The model already knows what its tool changed. It needs to hear only
    // that the hook changed those files again, or failed to.
    const rewritten = changed(afterTool, current);
    const notes: string[] = [];
    if (rewritten.length > 0) notes.push(rewriteNotice(root, directory, rewritten, toolOutput, artifact));
    if (errors.length > 0) notes.push(`Go auto-fix errors: ${errors.join("; ")}.`);
    if (notes.length === 0) return undefined;
    return { hookSpecificOutput: { hookEventName: resultEvent(event), additionalContext: notes.join(" ") } } as Record<string, unknown>;
  });
}

// Diagnostics about the sources themselves, such as an edit sequence that has
// not compiled yet. They are the agent's intermediate state, not hook failures.
function sourceDiagnostic(line: string): boolean {
  return /\.go:\d+(?::\d+)?:/.test(line) || /^go: updates to go\.mod needed|missing go\.sum entry/.test(line);
}

// The first line that says why a tool failed; `# package` headers do not.
function failureLine(stderr: string): string {
  return stderr.split("\n").map((line) => line.trim()).find((line) => line && !line.startsWith("# ")) ?? "failed";
}

// Files whose go fix or gofmt waited for their sources to build or parse.
function readPending(directory: string): string[] {
  try {
    const value = JSON.parse(fs.readFileSync(path.join(directory, "pending-fix.json"), "utf8")) as unknown;
    return Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === "string") : [];
  } catch {
    return [];
  }
}

function writePending(directory: string, pending: Set<string>): void {
  const file = path.join(directory, "pending-fix.json");
  if (pending.size === 0) {
    if (fs.existsSync(file)) fs.unlinkSync(file);
    return;
  }
  writeBaseline(file, [...pending].sort());
}

const INLINE_DIFF_LINES = 40;

// Tells the model exactly what the hook changed after its tool: the diff when
// short, otherwise the changed line ranges of each file.
function rewriteNotice(root: string, directory: string, rewritten: string[], toolOutput: Map<string, string>, artifact: string): string {
  const scratch = path.join(directory, "rewrite-before");
  const diffs: string[] = [];
  try {
    for (const relative of rewritten) {
      const original = toolOutput.get(relative);
      const source = path.join(root, relative);
      if (original === undefined || !fs.existsSync(source)) continue;
      fs.writeFileSync(scratch, original, { mode: 0o600 });
      diffs.push(runCommand(["diff", "-U0", "--label", `a/${relative}`, "--label", `b/${relative}`, scratch, source], { cwd: root }).stdout);
    }
  } finally {
    if (fs.existsSync(scratch)) fs.unlinkSync(scratch);
  }
  const text = diffs.join("").trimEnd();
  if (text.split("\n").length <= INLINE_DIFF_LINES) return `go fix/gofmt rewrote Go files you edited:\n${text}`;
  const ranges = new Map<string, string[]>();
  let file = "";
  for (const line of text.split("\n")) {
    if (line.startsWith("+++ b/")) {
      file = line.slice(6);
      ranges.set(file, []);
      continue;
    }
    const hunk = /^@@ -\S+ \+(\d+)(?:,(\d+))? @@/.exec(line);
    const spans = ranges.get(file);
    if (!hunk || spans === undefined) continue;
    const start = Number(hunk[1]);
    const count = hunk[2] ? Number(hunk[2]) : 1;
    spans.push(count === 0 ? `deletion after ${start}` : count === 1 ? `${start}` : `${start}-${start + count - 1}`);
  }
  const listed: string[] = [];
  for (const [name, spans] of ranges) listed.push(`${name} lines ${spans.join(", ")}`);
  return `go fix/gofmt rewrote ${listed.join("; ")}. Diff: ${artifact}.`;
}

function check(root: string, directory: string): Record<string, unknown> | undefined {
  const file = path.join(directory, "baseline.json");
  let baselineData: Baseline;
  try {
    baselineData = JSON.parse(fs.readFileSync(file, "utf8")) as Baseline;
  } catch {
    // An unfinished background scan is not evidence of an edit. New projects
    // get an intentional empty baseline from PostToolUse when their first
    // writing tool completes.
    if (!fs.existsSync(path.join(directory, "edited"))) return undefined;
    baselineData = { files: {}, findings: {} };
  }
  const files = changed(baselineData.files, sourceSnapshot(root, directory));
  if (fs.existsSync(path.join(directory, "project-absent-at-baseline")) &&
      !fs.existsSync(path.join(directory, "edited"))) return undefined;
  if (files.length === 0) return undefined;
  const current = runChecks(root);
  const fresh: string[] = [];
  for (const [tool, lines] of Object.entries(current)) {
    const previous = new Map<string, number>();
    for (const signature of baselineData.findings[tool] ?? []) {
      previous.set(signature, (previous.get(signature) ?? 0) + 1);
    }
    for (const line of lines) {
      const remaining = previous.get(line.signature) ?? 0;
      if (remaining > 0) previous.set(line.signature, remaining - 1);
      else fresh.push(`${tool}: ${line.display}`);
    }
  }
  if (fresh.length === 0) return undefined;
  const preview = fresh.slice(0, 30).join("\n");
  const more = fresh.length > 30 ? `\n...and ${fresh.length - 30} more` : "";
  return { decision: "block", reason: `Fix new Go quality findings before completing:\n${preview}${more}` };
}

export function responseFor(event: unknown, action: string): Record<string, unknown> | undefined {
  if (!isRecord(event)) return undefined;
  const cwd = asString(event.cwd);
  if (!cwd) return undefined;
  const root = projectRoot(cwd);
  if (!root) {
    if (action === "fence" && createsGoProject(event)) {
      if (generatedGuardResponse(event) || (event.tool_name === "Bash" && subagentGuardResponse(event))) return undefined;
      const pendingRoot = path.resolve(cwd);
      const absentDirectory = stateDir(event, pendingRoot);
      if (!absentDirectory) return undefined;
      acquireWriter(event, pendingRoot);
      let ready = false;
      try {
        withLockedDir(absentDirectory, () => {
          const file = path.join(absentDirectory, "baseline.json");
          const prospective = prospectiveModules(event, pendingRoot);
          const files = snapshot(pendingRoot, [pendingRoot, ...prospective]);
          if (fs.existsSync(file)) {
            const before = workingFiles(absentDirectory);
            if (changed(before, files).length > 0) saveWorking(pendingRoot, absentDirectory, files, before);
            return;
          }
          const recorded = runChecks(pendingRoot, prospective);
          const signatures: Record<string, string[]> = {};
          for (const [tool, lines] of Object.entries(recorded)) signatures[tool] = lines.map((line) => line.signature);
          saveWorking(pendingRoot, absentDirectory, files);
          writeBaseline(file, { files, findings: signatures });
          fs.writeFileSync(path.join(absentDirectory, "project-absent-at-baseline"), "", { mode: 0o600 });
        });
        fs.writeFileSync(path.join(absentDirectory, "first-project-tool"), toolId(event), { mode: 0o600 });
        ready = true;
        return undefined;
      } catch {
        // Attribution is best effort; a failed snapshot must not block the tool.
        return undefined;
      } finally {
        if (!ready) releaseWriter(event, pendingRoot);
      }
    }
    if (action === "edit") {
      try {
        const directory = stateDir(event, path.resolve(cwd));
        return directory ? postPendingEdit(event, path.resolve(cwd), directory) : undefined;
      } finally {
        releaseWriter(event, cwd);
      }
    }
    if (action === "check") {
      const directory = stateDir(event, path.resolve(cwd));
      if (directory) reconcileFailedWriter(event, path.resolve(cwd));
    }
    return undefined;
  }
  const directory = stateDir(event, root);
  if (!directory) return undefined;
  // Baselines run golangci-lint and deadcode, which can take minutes; they
  // hold only the session state lock so other writers are not stalled.
  if (action === "baseline") baseline(root, directory);
  else if (action === "fence") {
    if (!potentialWrite(event)) return undefined;
    if (generatedGuardResponse(event) || (event.tool_name === "Bash" && subagentGuardResponse(event))) return undefined;
    let ready = false;
    try {
      if (!fs.existsSync(path.join(directory, "baseline.json"))) {
        baseline(root, directory);
      }
      acquireWriter(event, root);
      refreshWorking(root, directory);
      ready = true;
      return undefined;
    } catch {
      // Attribution is best effort; a failed snapshot must not block the tool.
      return undefined;
    } finally {
      if (!ready) releaseWriter(event, root);
    }
  }
  else if (action === "edit") {
    const moduleRoot = fs.existsSync(path.join(cwd, "go.mod")) ? path.resolve(cwd) : undefined;
    const oldDirectory = moduleRoot && moduleRoot !== root ? stateDir(event, moduleRoot) : undefined;
    const editRoot = moduleRoot && oldDirectory && fs.existsSync(path.join(oldDirectory, "working.json")) &&
      !fs.existsSync(path.join(directory, "working.json")) ? moduleRoot : root;
    const editDirectory = editRoot !== root && oldDirectory ? oldDirectory : directory;
    try {
      return editDirectory ? postEdit(event, editRoot, editDirectory) : undefined;
    } finally {
      releaseWriter(event, cwd);
      releaseWriter(event, root);
    }
  }
  else if (action === "check") {
    const recovered = reconcileFailedWriter(event, root);
    let result = check(root, directory);
    const moduleRoot = fs.existsSync(path.join(cwd, "go.mod")) ? path.resolve(cwd) : undefined;
    const oldDirectory = moduleRoot && moduleRoot !== root ? stateDir(event, moduleRoot) : undefined;
    if (moduleRoot && oldDirectory && fs.existsSync(path.join(oldDirectory, "baseline.json"))) {
      const oldResult = check(moduleRoot, oldDirectory);
      if (oldResult && result) result.reason = `${asString(result.reason) ?? ""}\n${asString(oldResult.reason) ?? ""}`;
      else if (oldResult) result = oldResult;
    }
    if (result && recovered) result.reason = `${asString(result.reason) ?? ""}\n${recovered}`;
    if (result) {
      // Codex does not cap Stop continuations; unchanged findings after a
      // continuation are reported instead of blocking again.
      const reason = asString(result.reason) ?? "";
      const lastBlock = path.join(directory, "last-block");
      let previous: string | undefined;
      try {
        previous = fs.readFileSync(lastBlock, "utf8");
      } catch {
        previous = undefined;
      }
      if (event.stop_hook_active === true && previous === reason) return { systemMessage: reason };
      try {
        fs.writeFileSync(lastBlock, reason, { mode: 0o600 });
      } catch {
        // A missing state directory only disables the repeat guard.
      }
    }
    return result;
  }
  return undefined;
}

function main(): number {
  if (handleVersion(VERSION)) return 0;
  const action = process.argv.length > 2 ? process.argv[2] : "";
  if (action === "recover") {
    if (process.argv.length < 4 || process.argv[3] !== "--confirm-stopped") return 2;
    process.stdout.write(`${recoverStoppedWriter(process.cwd())}\n`);
    return 0;
  }
  try {
    const response = responseFor(readEvent(), action);
    if (response) writeJson(response);
  } catch (error) {
    // A hook failure must not block or break the tool it observes.
    process.stderr.write(`go_quality ${action}: ${error instanceof Error ? error.message : String(error)}\n`);
  }
  return 0;
}

runMain("go_quality", main);

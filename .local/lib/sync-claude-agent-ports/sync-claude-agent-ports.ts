import { chmodSync, closeSync, existsSync, fsyncSync, mkdirSync, mkdtempSync, openSync, readFileSync, readdirSync, renameSync, rmdirSync, statSync, unlinkSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

export const VERSION = "1.0.5";
const MODEL_MAP: Record<string, string> = {
  "gpt-5.6-luna": "sonnet",
  "gpt-5.6-sol": "opus",
  "gpt-6-astra": "opus",
};
const READ_TOOLS = "Read, Grep, Glob, Bash, Write, TodoWrite, Skill";
const EDIT_TOOLS = "Read, Grep, Glob, Bash, Edit, Write, NotebookEdit, TodoWrite, Skill";
const METADATA: Record<string, { color: string; tools: string; model?: string; effort?: string }> = {
  "council-investigator": { model: "inherit", color: "yellow", tools: "Read, Grep, Glob, Bash, Write, TodoWrite" },
  "council-member": { model: "inherit", color: "orange", tools: "Read, Write, TodoWrite" },
  explorer: { color: "pink", tools: READ_TOOLS },
  implementer: { model: "opus", effort: "medium", color: "blue", tools: `${EDIT_TOOLS}, Agent` },
  "review-correctness": { color: "red", tools: READ_TOOLS },
  "review-simplify": { model: "sonnet", effort: "high", color: "green", tools: READ_TOOLS },
  "web-reviewer": { color: "purple", tools: READ_TOOLS },
};

export function adaptText(text: string, hasBash: boolean): string {
  text = text
    .replace(/You are Codex, a GPT-(?:5\.6 (?:Luna|Sol)|6 Astra) subagent/, "You are a subagent")
    .replaceAll("The handoff provides", "The task provides")
    .replaceAll("When the handoff includes `result_artifact`", "When the task names a result artifact path")
    .replaceAll("`input_artifacts`", "input artifact paths")
    .replaceAll("`result_artifact`", "result artifact path")
    .replaceAll("When no result artifact is requested", "When no result artifact is named")
    .replace(/Do not\s+perform external writes,\s+control processes,\s+or spawn subagents\./g,
      "Do not perform external writes or control processes. You cannot spawn another agent.")
    .replace(/Do\s+not spawn another agent\./g, "You cannot spawn another agent.");
  if (hasBash) {
    text = text.replace(/owns\s+mutation\s+and\s+commands\s+with\s+unknown\s+effects\./g,
      "owns mutation and commands with unknown effects. A hook enforces this boundary.");
  }
  return text.trim();
}

export function renderRole(role: string, config: Record<string, unknown>, guard: string): string {
  const metadata = METADATA[role];
  if (!metadata) throw new Error(`${role}: missing Claude metadata`);
  if (config.name !== role) throw new Error(`${role}: TOML name does not match its filename`);
  if (typeof config.description !== "string" || !config.description.trim()) {
    throw new Error(`${role}: missing description`);
  }
  if (typeof config.developer_instructions !== "string" || !config.developer_instructions.trim()) {
    throw new Error(`${role}: missing developer_instructions`);
  }
  const fields = ["---", `name: ${role}`, `description: ${JSON.stringify(config.description.trim())}`];
  const mapped = config.model == null ? undefined : MODEL_MAP[String(config.model)];
  if (config.model != null && !mapped) {
    throw new Error(`${role}: no Claude mapping for model ${JSON.stringify(config.model)}`);
  }
  const model = metadata.model ?? mapped;
  if (model && model !== "inherit") {
    const effort = metadata.effort ?? config.model_reasoning_effort;
    if (typeof effort !== "string" || !effort) throw new Error(`${role}: model has no model_reasoning_effort`);
    fields.push(`model: ${model}`, `effort: ${effort}`);
  }
  const hasBash = metadata.tools.split(", ").includes("Bash");
  fields.push(`color: ${metadata.color}`, `tools: ${metadata.tools}`);
  if (hasBash) {
    fields.push("hooks:", "  PreToolUse:", '    - matcher: "Bash"', "      hooks:",
      "        - type: command", `          command: ${JSON.stringify(guard)}`, "          timeout: 5");
  }
  const body = adaptText(config.developer_instructions, hasBash);
  if (hasBash && !body.includes("A hook enforces this boundary.")) {
    throw new Error(`${role}: Bash role has no container-command boundary`);
  }
  return fields.join("\n") + "\n---\n" + body + "\n";
}

function roleNames(directory: string, extension: string): string[] {
  if (!existsSync(directory)) return [];
  return readdirSync(directory).filter(name => name.endsWith(extension)).map(name => name.slice(0, -extension.length)).sort();
}

// Validate and render every source before permitting any output mutation.
export function expectedPorts(home: string): Map<string, string> {
  const source = join(home, ".codex", "agents");
  const roles = roleNames(source, ".toml");
  const known = Object.keys(METADATA).sort();
  if (JSON.stringify(roles) !== JSON.stringify(known)) {
    throw new Error(`role metadata mismatch: missing=${JSON.stringify(roles.filter(role => !known.includes(role)))}, extra=${JSON.stringify(known.filter(role => !roles.includes(role)))}`);
  }
  return new Map(roles.map(role => {
    const config = Bun.TOML.parse(readFileSync(join(source, `${role}.toml`), "utf8"));
    return [join(home, ".claude", "agents", `${role}.md`), renderRole(role, config, join(home, ".codex", "hooks", "bin", "subagent_exec_guard"))];
  }));
}

function atomicWrite(path: string, text: string): void {
  const mode = existsSync(path) ? statSync(path).mode & 0o7777 : 0o644;
  const temporaryDirectory = mkdtempSync(join(dirname(path), ".sync-claude-agent-ports-"));
  const temporary = join(temporaryDirectory, "role.md");
  try {
    writeFileSync(temporary, text, { mode });
    chmodSync(temporary, mode);
    const fd = openSync(temporary, "r");
    try { fsyncSync(fd); } finally { closeSync(fd); }
    renameSync(temporary, path);
  } finally {
    if (existsSync(temporary)) unlinkSync(temporary);
    rmdirSync(temporaryDirectory);
  }
}

export function syncPorts(home: string, check: boolean): number {
  const expected = expectedPorts(home);
  const output = join(home, ".claude", "agents");
  const extra = roleNames(output, ".md").filter(role => !expected.has(join(output, `${role}.md`)));
  if (extra.length) throw new Error(`unexpected Claude role files: ${extra.join(", ")}`);
  const stale = [...expected].filter(([path, content]) => !existsSync(path) || readFileSync(path, "utf8") !== content);
  if (check) {
    if (stale.length) {
      console.log("Claude agent ports are stale; run sync-claude-agent-ports:");
      for (const [path] of stale) console.log(path);
      return 1;
    }
    console.log("Claude agent ports are current");
    return 0;
  }
  if (stale.length) mkdirSync(output, { recursive: true });
  for (const [path, content] of stale) {
    atomicWrite(path, content);
    console.log(`updated ${path}`);
  }
  if (!stale.length) console.log("Claude agent ports are already current");
  return 0;
}

if (import.meta.main) {
  try {
    const args = process.argv.slice(2);
    if (args.length === 1 && args[0] === "--version") {
      console.log(VERSION);
    } else if (args.length === 1 && ["--help", "-h"].includes(args[0])) {
      console.log("Usage: sync-claude-agent-ports [--check | --version]\nGenerate .claude/agents from native .codex/agents TOMLs.");
    } else {
      if (args.length && !(args.length === 1 && args[0] === "--check")) throw new Error("expected --check, --version, or no arguments");
      const home = resolve(dirname(process.execPath), "../..");
      process.exitCode = syncPorts(home, args[0] === "--check");
    }
  } catch (error) {
    console.error(`sync-claude-agent-ports: ${error instanceof Error ? error.message : error}`);
    process.exitCode = 1;
  }
}

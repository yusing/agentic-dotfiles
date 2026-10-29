import { chmodSync, closeSync, existsSync, fsyncSync, mkdirSync, mkdtempSync, openSync, readFileSync, readdirSync, renameSync, rmdirSync, statSync, unlinkSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

export const VERSION = "1.0.7";
export const BUILTIN_ROLES = [
  "ask",
  "code",
  "debug",
  "explore",
  "general",
  "orchestrator",
  "plan",
] as const;
type Permission = "allow" | "deny";
const READ_PERMISSION: Record<string, Permission> = { bash: "allow", edit: "deny", task: "deny" };
const METADATA: Record<string, { color: string; model: string; variant?: string; permission: Record<string, Permission> }> = {
  "council-investigator": { model: "inherit", color: "#EAB308", permission: READ_PERMISSION },
  "council-member": { model: "inherit", color: "#F97316", permission: { bash: "deny", edit: "deny", task: "deny" } },
  explorer: { model: "kilo/openai/gpt-6.1-terra", variant: "xhigh", color: "#EC4899", permission: READ_PERMISSION },
  investigator: { model: "kilo/openai/gpt-6.1-sol", variant: "medium", color: "#06B6D4", permission: READ_PERMISSION },
  "review-correctness": { model: "kilo/openai/gpt-6.1-sol", variant: "high", color: "#EF4444", permission: READ_PERMISSION },
  "review-simplify": { model: "kilo/openai/gpt-6.1-sol", variant: "high", color: "#22C55E", permission: READ_PERMISSION },
  "ui-reviewer": { model: "kilo/openai/gpt-6-astra", variant: "high", color: "#A855F7", permission: READ_PERMISSION },
};

export function adaptText(text: string): string {
  return text
    .replace(/You are Codex, a GPT-6 (?:Astra|Sol|Luna) subagent/, "You are a subagent")
    .replaceAll("The handoff provides", "The task provides")
    .replaceAll("When the handoff includes `result_artifact`", "When the task names a result artifact path")
    .replaceAll("`input_artifacts`", "input artifact paths")
    .replaceAll("`result_artifact`", "result artifact path")
    .replaceAll("When no result artifact is requested", "When no result artifact is named")
    .replace(/Do not\s+perform external writes,\s+control processes,\s+or spawn subagents\./g,
      "Do not perform external writes or control processes. You cannot spawn another agent.")
    .replace(/Do\s+not spawn another agent\./g, "You cannot spawn another agent.")
    .trim();
}

function yamlPermission(permission: Record<string, Permission>): string[] {
  return ["permission:", ...Object.keys(permission).sort().map(key => `  ${key}: ${permission[key]}`)];
}

export function renderDisabled(): string {
  return "---\ndisable: true\n---\n";
}

export function renderRole(role: string, config: Record<string, unknown>): string {
  const metadata = METADATA[role];
  if (!metadata) throw new Error(`${role}: missing Kilo metadata`);
  if (config.name !== role) throw new Error(`${role}: TOML name does not match its filename`);
  if (typeof config.description !== "string" || !config.description.trim()) {
    throw new Error(`${role}: missing description`);
  }
  if (typeof config.developer_instructions !== "string" || !config.developer_instructions.trim()) {
    throw new Error(`${role}: missing developer_instructions`);
  }
  const fields = ["---", `description: ${JSON.stringify(config.description.trim())}`, "mode: subagent"];
  if (config.model != null || config.model_reasoning_effort != null) {
    throw new Error(`${role}: Codex role must leave model and effort to the spawning agent`);
  }
  if (metadata.model !== "inherit") fields.push(`model: ${metadata.model}`, `variant: ${metadata.variant}`);
  const hasBash = metadata.permission.bash === "allow";
  fields.push(`color: ${JSON.stringify(metadata.color)}`, ...yamlPermission(metadata.permission));
  const body = adaptText(config.developer_instructions);
  if (hasBash && !/owns\s+mutation\s+and\s+commands\s+with\s+unknown\s+effects\./.test(body)) {
    throw new Error(`${role}: Bash role has no container-command boundary`);
  }
  if (body.includes("A hook enforces this boundary.")) {
    throw new Error(`${role}: Kilo port must not claim a command hook`);
  }
  return fields.join("\n") + "\n---\n" + body + "\n";
}

function roleNames(directory: string, extension: string): string[] {
  if (!existsSync(directory)) return [];
  return readdirSync(directory).filter(name => name.endsWith(extension)).map(name => name.slice(0, -extension.length)).sort();
}

export function expectedPorts(home: string): Map<string, string> {
  const source = join(home, ".codex", "agents");
  const roles = roleNames(source, ".toml");
  const known = Object.keys(METADATA).sort();
  if (JSON.stringify(roles) !== JSON.stringify(known)) {
    throw new Error(`role metadata mismatch: missing=${JSON.stringify(roles.filter(role => !known.includes(role)))}, extra=${JSON.stringify(known.filter(role => !roles.includes(role)))}`);
  }
  const output = join(home, ".config", "kilo", "agent");
  const ports = new Map(roles.map(role => {
    const config = Bun.TOML.parse(readFileSync(join(source, `${role}.toml`), "utf8"));
    return [join(output, `${role}.md`), renderRole(role, config)];
  }));
  for (const role of BUILTIN_ROLES) {
    if (METADATA[role]) {
      throw new Error(`${role}: built-in name collides with a Codex role`);
    }
    ports.set(join(output, `${role}.md`), renderDisabled());
  }
  return ports;
}

function atomicWrite(path: string, text: string): void {
  const mode = existsSync(path) ? statSync(path).mode & 0o7777 : 0o644;
  const temporaryDirectory = mkdtempSync(join(dirname(path), ".sync-kilo-agent-ports-"));
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
  const output = join(home, ".config", "kilo", "agent");
  const extra = roleNames(output, ".md").filter(role => !expected.has(join(output, `${role}.md`)));
  if (extra.length) throw new Error(`unexpected Kilo role files: ${extra.join(", ")}`);
  const stale = [...expected].filter(([path, content]) => !existsSync(path) || readFileSync(path, "utf8") !== content);
  if (check) {
    if (stale.length) {
      console.log("Kilo agent ports are stale; run sync-kilo-agent-ports:");
      for (const [path] of stale) console.log(path);
      return 1;
    }
    console.log("Kilo agent ports are current");
    return 0;
  }
  if (stale.length) mkdirSync(output, { recursive: true });
  for (const [path, content] of stale) {
    atomicWrite(path, content);
    console.log(`updated ${path}`);
  }
  if (!stale.length) console.log("Kilo agent ports are already current");
  return 0;
}

if (import.meta.main) {
  try {
    const args = process.argv.slice(2);
    if (args.length === 1 && args[0] === "--version") {
      console.log(VERSION);
    } else if (args.length === 1 && ["--help", "-h"].includes(args[0])) {
      console.log("Usage: sync-kilo-agent-ports [--check | --version]\nGenerate .config/kilo/agent from native .codex/agents TOMLs.");
    } else {
      if (args.length && !(args.length === 1 && args[0] === "--check")) throw new Error("expected --check, --version, or no arguments");
      const home = resolve(dirname(process.execPath), "../..");
      process.exitCode = syncPorts(home, args[0] === "--check");
    }
  } catch (error) {
    console.error(`sync-kilo-agent-ports: ${error instanceof Error ? error.message : error}`);
    process.exitCode = 1;
  }
}

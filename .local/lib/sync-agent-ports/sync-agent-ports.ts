import { chmodSync, closeSync, existsSync, fsyncSync, mkdirSync, mkdtempSync, openSync, readFileSync, readdirSync, renameSync, rmdirSync, statSync, unlinkSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

export const VERSION = "2.0.0";
const READ_TOOLS = "Read, Grep, Glob, Bash, Write, TodoWrite";
const CLAUDE_METADATA: Record<string, { color: string; tools: string }> = {
  "council-investigator": { color: "yellow", tools: READ_TOOLS },
  "council-member": { color: "orange", tools: "Read, Write, TodoWrite" },
  explorer: { color: "pink", tools: READ_TOOLS },
  investigator: { color: "cyan", tools: READ_TOOLS },
  "review-correctness": { color: "red", tools: READ_TOOLS },
  "review-simplify": { color: "green", tools: READ_TOOLS },
  "ui-reviewer": { color: "purple", tools: READ_TOOLS },
};

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
const KILO_METADATA: Record<string, { color: string; model: string; variant?: string; permission: Record<string, Permission> }> = {
  "council-investigator": { model: "inherit", color: "#EAB308", permission: READ_PERMISSION },
  "council-member": { model: "inherit", color: "#F97316", permission: { bash: "deny", edit: "deny", task: "deny" } },
  explorer: { model: "kilo/openai/gpt-6.1-terra", variant: "xhigh", color: "#EC4899", permission: READ_PERMISSION },
  investigator: { model: "kilo/openai/gpt-6.2-sol", variant: "medium", color: "#06B6D4", permission: READ_PERMISSION },
  "review-correctness": { model: "kilo/openai/gpt-6.2-sol", variant: "high", color: "#EF4444", permission: READ_PERMISSION },
  "review-simplify": { model: "kilo/openai/gpt-6.2-sol", variant: "high", color: "#22C55E", permission: READ_PERMISSION },
  "ui-reviewer": { model: "kilo/openai/gpt-6.2-astra", variant: "high", color: "#A855F7", permission: READ_PERMISSION },
};

export function adaptText(text: string): string {
  text = text
    .replace(/You are Codex, a GPT-6 (?:Astra|Sol|Luna) subagent/, "You are a subagent")
    .replaceAll("The handoff provides", "The task provides")
    .replaceAll("When the handoff includes `result_artifact`", "When the task names a result artifact path")
    .replaceAll("`input_artifacts`", "input artifact paths")
    .replaceAll("`result_artifact`", "result artifact path")
    .replaceAll("When no result artifact is requested", "When no result artifact is named")
    .replace(/Do not\s+perform external writes,\s+control processes,\s+or spawn subagents\./g,
      "Do not perform external writes or control processes. You cannot spawn another agent.")
    .replace(/Do\s+not spawn another agent\./g, "You cannot spawn another agent.");
  return text.trim();
}

export type Client = "claude" | "kilo" | "agy";

const PORTS = {
  claude: { label: "Claude", directory: ".claude/agents" },
  kilo: { label: "Kilo", directory: ".config/kilo/agent" },
  agy: { label: "Antigravity", directory: ".gemini/config/agents" },
};

export function renderDisabled(): string {
  return "---\ndisable: true\n---\n";
}

export function renderRole(
  client: Client,
  role: string,
  config: Record<string, unknown>,
  options: { guard?: string; subagent?: string } = {},
): string {
  const metadata = CLAUDE_METADATA[role];
  if (!metadata || (client === "kilo" && !KILO_METADATA[role])) {
    throw new Error(`${role}: missing ${PORTS[client].label} metadata`);
  }
  if (config.name !== role) {
    throw new Error(`${role}: TOML name does not match its filename`);
  }
  if (typeof config.description !== "string" || !config.description.trim()) {
    throw new Error(`${role}: missing description`);
  }
  if (typeof config.developer_instructions !== "string" ||
      !config.developer_instructions.trim()) {
    throw new Error(`${role}: missing developer_instructions`);
  }
  if (config.model != null || config.model_reasoning_effort != null) {
    throw new Error(`${role}: Codex role must leave model and effort to the spawning agent`);
  }

  const fields = ["---", `description: ${JSON.stringify(config.description.trim())}`];
  let body = adaptText(config.developer_instructions);
  if (client === "kilo") {
    const kilo = KILO_METADATA[role];
    fields.push("mode: subagent");
    if (kilo.model !== "inherit") {
      fields.push(`model: ${kilo.model}`, `variant: ${kilo.variant}`);
    }
    fields.push(`color: ${JSON.stringify(kilo.color)}`, "permission:",
      ...Object.keys(kilo.permission).sort().map(key =>
        `  ${key}: ${kilo.permission[key]}`));
    if (kilo.permission.bash === "allow" &&
        !/owns\s+mutation\s+and\s+commands\s+with\s+unknown\s+effects\./.test(body)) {
      throw new Error(`${role}: Bash role has no container-command boundary`);
    }
    if (body.includes("A hook enforces this boundary.")) {
      throw new Error(`${role}: Kilo port must not claim a command hook`);
    }
  } else {
    fields.splice(1, 0, `name: ${role}`);
    const hasShell = metadata.tools.split(", ").includes("Bash");
    if (client === "agy") {
      if (!options.subagent?.trim()) {
        throw new Error("Antigravity requires nonempty subagent guidance");
      }
      const tools = ["view_file", "write_to_file"];
      if (hasShell) {
        tools.push("grep_search", "find_by_name", "list_dir", "run_command");
      }
      fields.push("mainAgent: false", "subagent: true", "tools:",
        ...tools.map(tool => `  - ${tool}`));
      body = `${options.subagent.trim()}\n\n${body}`;
    } else {
      fields.push(`color: ${metadata.color}`, `tools: ${metadata.tools}`);
      if (hasShell) {
        if (!options.guard) throw new Error(`${role}: missing Claude command guard`);
        fields.push("hooks:", "  PreToolUse:", '    - matcher: "Bash"', "      hooks:",
          "        - type: command",
          `          command: ${JSON.stringify(options.guard)}`, "          timeout: 5");
      }
    }
  }
  return fields.join("\n") + "\n---\n" + body + "\n";
}

function roleNames(directory: string, extension: string): string[] {
  if (!existsSync(directory)) return [];
  return readdirSync(directory)
    .filter(name => name.endsWith(extension))
    .map(name => name.slice(0, -extension.length))
    .sort();
}

function expectedPorts(home: string, client: Client): Map<string, string> {
  const source = join(home, ".codex/agents");
  const roles = roleNames(source, ".toml");
  const output = join(home, PORTS[client].directory);
  const known = Object.keys(client === "kilo" ? KILO_METADATA : CLAUDE_METADATA).sort();
  const missing = known.filter(role => !roles.includes(role));
  const extra = roles.filter(role => !known.includes(role));
  if (missing.length || extra.length) {
    throw new Error(`role metadata mismatch: missing=${missing}, extra=${extra}`);
  }
  const options = {
    guard: join(home, ".codex/hooks/bin/subagent_exec_guard"),
    subagent: client === "agy"
      ? readFileSync(join(home, ".gemini/SUBAGENT.md"), "utf8") : undefined,
  };
  const ports = new Map(roles.map(role => {
    const config = Bun.TOML.parse(readFileSync(join(source, `${role}.toml`), "utf8"));
    return [join(output, `${role}.md`), renderRole(client, role, config, options)];
  }));
  if (client === "kilo") {
    for (const role of BUILTIN_ROLES) {
      if (roles.includes(role)) {
        throw new Error(`${role}: built-in name collides with a Codex role`);
      }
      if (role !== "code") ports.set(join(output, `${role}.md`), renderDisabled());
    }
  }
  return ports;
}

function atomicWrite(path: string, text: string): void {
  const mode = existsSync(path) ? statSync(path).mode & 0o7777 : 0o644;
  const temporaryDirectory = mkdtempSync(join(dirname(path), ".sync-agent-ports-"));
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

export function syncPorts(home: string, client: Client, check: boolean): number {
  const { directory, label } = PORTS[client];
  const expected = expectedPorts(home, client);
  const output = join(home, directory);
  const extra = roleNames(output, ".md").filter(role =>
    !(client === "kilo" && role === "code") && !expected.has(join(output, `${role}.md`)));
  if (extra.length) throw new Error(`unexpected ${label} role files: ${extra.join(", ")}`);

  const codePath = join(output, "code.md");
  const obsoleteCodeStub = client === "kilo" && existsSync(codePath) &&
    readFileSync(codePath, "utf8") === renderDisabled();
  const stale = [...expected].filter(([path, content]) =>
    !existsSync(path) || readFileSync(path, "utf8") !== content);
  if (check) {
    if (stale.length || obsoleteCodeStub) {
      console.log(`${label} agent ports are stale; run sync-agent-ports ${client}:`);
      for (const [path] of stale) console.log(path);
      if (obsoleteCodeStub) console.log(codePath);
      return 1;
    }
    console.log(`${label} agent ports are current`);
    return 0;
  }
  if (stale.length) mkdirSync(output, { recursive: true });
  for (const [path, content] of stale) {
    atomicWrite(path, content);
    console.log(`updated ${path}`);
  }
  if (obsoleteCodeStub) {
    unlinkSync(codePath);
    console.log(`removed ${codePath}`);
  }
  if (!stale.length && !obsoleteCodeStub) console.log(`${label} agent ports are already current`);
  return 0;
}

if (import.meta.main) {
  const usage = "Usage: sync-agent-ports <claude|kilo|agy> [--check]";
  try {
    const [client, ...flags] = process.argv.slice(2);
    if (!flags.length && client === "--version") {
      console.log(VERSION);
    } else if (!flags.length && (client === "-h" || client === "--help")) {
      console.log(usage);
    } else {
      if ((client !== "claude" && client !== "kilo" && client !== "agy") ||
          flags.length > 1 || (flags.length === 1 && flags[0] !== "--check")) {
        throw new Error(usage);
      }
      const home = resolve(dirname(process.execPath), "../..");
      process.exitCode = syncPorts(home, client, flags[0] === "--check");
    }
  } catch (error) {
    console.error(`sync-agent-ports: ${error instanceof Error ? error.message : error}`);
    process.exitCode = 1;
  }
}

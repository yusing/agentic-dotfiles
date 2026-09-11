import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import {
  accessSync,
  chmodSync,
  constants,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  renameSync,
  statSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { arch, platform } from "node:os";
import { basename, delimiter, dirname, extname, join, resolve } from "node:path";

const VERSION = "1.0.1";
const SOURCE_EXTENSIONS = new Set([".ts", ".json", ".lock", ".toml"]);

class BuildFailure {
  constructor(readonly status: number) {}
}

function commandPath(name: string): string {
  for (const directory of (process.env.PATH ?? "").split(delimiter)) {
    const candidate = resolve(directory || ".", name);
    try {
      accessSync(candidate, constants.X_OK);
      return candidate;
    } catch {
      // Keep searching caller PATH in order.
    }
  }
  throw new Error(`compile-agent-tools: command not found: ${name}`);
}

function commandVersion(command: string): string {
  const result = spawnSync(command, ["--version"], { encoding: "utf8" });
  if (result.status !== 0 || result.error) {
    throw new Error(`compile-agent-tools: cannot identify compiler: ${command}`);
  }
  return result.stdout.trim();
}

function directorySourceFiles(directory: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory() && entry.name !== "node_modules") {
      files.push(...directorySourceFiles(path));
    } else if (
      entry.isFile()
      && !entry.name.endsWith(".test.ts")
      && SOURCE_EXTENSIONS.has(extname(entry.name))
    ) {
      files.push(path);
    }
  }
  return files.sort();
}

function sourceFiles(input: string): string[] {
  try {
    if (!statSync(input).isDirectory()) return [input];
  } catch {
    return [input];
  }
  return directorySourceFiles(input);
}

function digestInputs(metadata: string, inputs: string[]): string {
  const digest = createHash("sha256");
  digest.update(metadata);
  digest.update("\0");
  for (const input of inputs.flatMap(sourceFiles).sort()) {
    digest.update(input);
    digest.update("\0");
    if (existsSync(input)) {
      digest.update(readFileSync(input));
    } else {
      digest.update("missing");
    }
    digest.update("\0");
  }
  return digest.digest("hex");
}

function storedDigest(state: string): string {
  try {
    return readFileSync(state, "utf8").trim();
  } catch {
    return "";
  }
}

function isExecutable(file: string): boolean {
  try {
    accessSync(file, constants.X_OK);
    return true;
  } catch {
    return false;
  }
}

function saveDigest(state: string, digest: string): void {
  const temporary = `${state}.tmp.${process.pid}`;
  try {
    writeFileSync(temporary, `${digest}\n`);
    renameSync(temporary, state);
  } finally {
    if (existsSync(temporary)) unlinkSync(temporary);
  }
}

function run(command: string, args: string[], cwd?: string): void {
  const result = spawnSync(command, args, { cwd, stdio: "inherit" });
  if (result.error) {
    throw new Error(`compile-agent-tools: failed to run ${command}: ${result.error.message}`);
  }
  if (result.status !== 0) throw new BuildFailure(result.status ?? 1);
}

function buildAtomically(
  output: string,
  command: string,
  args: (temporary: string) => string[],
  cwd?: string,
): void {
  const temporary = `${output}.compile-agent-tools.${process.pid}`;
  try {
    if (existsSync(temporary)) unlinkSync(temporary);
    run(command, args(temporary), cwd);
    chmodSync(temporary, 0o755);
    renameSync(temporary, output);
  } finally {
    if (existsSync(temporary)) unlinkSync(temporary);
  }
}

function usesFfi(files: string[]): boolean {
  return files
    .flatMap(sourceFiles)
    .some((file) => existsSync(file) && readFileSync(file, "utf8").includes("locked_state.ts"));
}

function main(): void {
  if (process.argv.length > 2 && process.argv[2] === "--version") {
    process.stdout.write(`${VERSION}\n`);
    return;
  }

  const toolHome = process.env.HOME;
  if (!toolHome) throw new Error("compile-agent-tools: HOME must be set");

  const codexHooks = join(toolHome, ".codex", "hooks");
  const grokHooks = join(toolHome, ".grok", "hooks");
  const localBin = join(toolHome, ".local", "bin");
  const localLib = join(toolHome, ".local", "lib");
  const cacheBase = process.env.XDG_CACHE_HOME || join(toolHome, ".cache");
  const bunConfig = join(toolHome, ".bunfig.toml");
  const cacheRoot = join(cacheBase, "compile-agent-tools");
  const codexBin = join(codexHooks, "bin");
  const grokBin = join(grokHooks, "bin");
  mkdirSync(codexBin, { recursive: true });
  mkdirSync(grokBin, { recursive: true });
  mkdirSync(cacheRoot, { recursive: true });

  const scriptc = commandPath("scriptc");
  const bun = commandPath("bun");
  const target = [
    `${platform()}-${arch()}`,
    `SCRIPTC_TARGET=${process.env.SCRIPTC_TARGET ?? ""}`,
    `SCRIPTC_CC=${process.env.SCRIPTC_CC ?? ""}`,
  ].join(" ");
  const scriptcIdentity = `${scriptc}:${commandVersion(scriptc)} linker=${process.env.SCRIPTC_LINKER ?? ""}`;
  const bunIdentity = `${bun}:${commandVersion(bun)}`;
  const sharedHookInputs = join(codexHooks, "lib");
  const sharedHookDigest = digestInputs("shared-hook-inputs", [sharedHookInputs]);
  const sharedUsesFfi = usesFfi([sharedHookInputs]);

  function compileHook(source: string, outputDirectory: string, extraInputs: string[] = []): void {
    const name = basename(source, ".ts");
    const output = join(outputDirectory, name);
    const ffi = sharedUsesFfi || usesFfi([source, ...extraInputs])
      ? join(codexHooks, "lib", "flock.ffi.json")
      : "";
    const digest = digestInputs(
      `scriptc=${scriptcIdentity} target=${target} shared=${sharedHookDigest} ffi=${ffi} flags=--no-keep-c`,
      [source, ...extraInputs],
    );
    const state = join(cacheRoot, `${name}.digest`);
    if (isExecutable(output) && storedDigest(state) === digest) return;

    buildAtomically(output, scriptc, (temporary) => {
      const args = ["build", source, "-o", temporary, "--no-keep-c"];
      if (ffi) args.push("--ffi", ffi);
      return args;
    });
    saveDigest(state, digest);
  }

  function ensureRewriteDependencies(directory: string): void {
    const state = join(cacheRoot, "rewrite-home-paths.dependencies.digest");
    const digest = digestInputs(
      `bun=${bunIdentity} target=${target} flags=install--frozen-lockfile--ignore-scripts`,
      [join(directory, "package.json"), join(directory, "bun.lock"), bunConfig],
    );
    if (existsSync(join(directory, "node_modules")) && storedDigest(state) === digest) return;
    run(bun, ["install", "--frozen-lockfile", "--ignore-scripts"], directory);
    saveDigest(state, digest);
  }

  function compileHelper(source: string, required = false): void {
    if (!existsSync(source)) {
      if (required) throw new Error(`compile-agent-tools: missing source: ${source}`);
      return;
    }
    const name = basename(source, ".ts");
    const output = join(localBin, name);
    const digest = digestInputs(
      `bun=${bunIdentity} target=${target} flags=build--compile`,
      [dirname(source), bunConfig],
    );
    const state = join(cacheRoot, `${name}.digest`);
    if (isExecutable(output) && storedDigest(state) === digest) return;

    if (name === "rewrite-home-paths") ensureRewriteDependencies(dirname(source));
    buildAtomically(output, bun, (temporary) => [
      "build",
      "--compile",
      `--outfile=${temporary}`,
      source,
    ]);
    saveDigest(state, digest);
  }

  for (const name of [
    "generated_code_guard",
    "subagent_exec_guard",
    "skills_mgr_inventory",
    "check_project",
    "session_start_context",
  ]) {
    compileHook(join(codexHooks, `${name}.ts`), codexBin);
  }
  compileHook(join(grokHooks, "adapt_codex_hook.ts"), grokBin, [
    join(codexHooks, "generated_code_guard.ts"),
    join(codexHooks, "subagent_exec_guard.ts"),
  ]);
  compileHook(join(grokHooks, "skills_path_guard.ts"), grokBin);

  if (existsSync(join(localLib, "rewrite-home-paths", "package.json"))) {
    compileHelper(join(localLib, "rewrite-home-paths", "rewrite-home-paths.ts"), true);
  }
  for (const [directory, name] of [
    ["grok-explore", "grok-explore"],
    ["sync-claude-agent-ports", "sync-claude-agent-ports"],
    ["claude-config-helper", "claude-config-helper"],
    ["patch-bitwarden-cli-fast-exit", "patch-bitwarden-cli-fast-exit"],
    ["svn-merge", "svn-merge"],
    ["open-file-in-herdr", "open-file-in-herdr"],
    ["deltapath-wifi-routes", "deltapath-wifi-routes"],
  ]) {
    compileHelper(join(localLib, directory, `${name}.ts`));
  }
  compileHelper(join(localLib, "project-public-config", "project-public-config.ts"), true);
}

try {
  main();
} catch (error) {
  if (error instanceof BuildFailure) process.exit(error.status);
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`${message}\n`);
  process.exit(1);
}

import { mkdtemp, open, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const VERSION = "1.0.0";
const EXCLUDED_DIRS = ".git,.hg,.svn,vendor,node_modules,dist,build,out,target,coverage,.venv,venv,third_party,Pods,__pycache__,.gradle,bower_components";
const EXCLUDED_PATH = String.raw`(^|/)(_?tests?|__tests__|spec|fixtures|mocks?|testdata|__mocks__|benches|benchmarks?|examples?|samples?|e2e|integration[-_]?tests?|test[-_](utils|support|helpers)|generated|__generated__)(/|$)|(^|/)_?tests?([_-][^/]*)?\.[^/]+$|(_tests?|\.tests?|\.spec|_spec|_bench|\.bench|\.benchmark)\.|\.(gen|generated|min)\.[^/]*$|\.pb\.(go|cc|h)$`;
const DEFAULTS = [
  "--include-ext", "c,h,cc,cpp,cxx,hpp,cs,go,java,js,mjs,cjs,jsx,ts,tsx,py,rb,php,rs,kt,kts,swift,scala,dart,vue,svelte,m,mm,sh,sql,lua,ex,exs,zig",
  "--exclude-dir", EXCLUDED_DIRS,
  "--not-match", EXCLUDED_PATH,
  "--no-gen=false", "--no-min=false", "--no-min-gen=false",
];
const DISCOVERY = [
  "--format=json", "--by-file", "--output=", "--format-multi=", "--report=",
  "--hotspots=false", "--by-author=false", "--timeline=false", "--coupling=false",
  "--coupling-weighted=false", "--mcp=false", "--languages=false",
  "--no-gen=false", "--no-min=false", "--no-min-gen=false", "--no-duplicates=false",
  "--verbose=false", "--debug=false", "--trace=false",
];
const HEADER = /^(?:code generated\b|@generated\b|<?auto(?:matically)?[- ]generated\b|this file (?:is|was|has been) (?:auto(?:matically)?[- ]generated|generated)\b|generated\b.*(?:do not edit|by\b)|do not edit(?:\s*[.!]|\s*$))/i;

// Inspect only the leading comment preamble, never strings in executable code.
export function generatedHeader(source: string): boolean {
  let block = false;
  for (let line of source.replace(/^\uFEFF/, "").split(/\r?\n/).slice(0, 80)) {
    line = line.trim();
    if (!line || line.startsWith("#!")) continue;
    if (block) {
      const end = line.indexOf("*/");
      if (HEADER.test((end < 0 ? line : line.slice(0, end)).replace(/^\*\s?/, ""))) return true;
      if (end >= 0) {
        block = false;
        if (line.slice(end + 2).trim()) return false;
      }
    } else if (line.startsWith("//") || line.startsWith("#")) {
      if (HEADER.test(line.replace(/^(?:\/\/|#)\s*/, ""))) return true;
    } else if (line.startsWith("/*")) {
      line = line.slice(2).trimStart();
      const end = line.indexOf("*/");
      if (HEADER.test(end < 0 ? line : line.slice(0, end))) return true;
      block = end < 0;
      if (end >= 0 && line.slice(end + 2).trim()) return false;
    } else return false;
  }
  return false;
}

// Let the installed scc describe option arity, including optional-value flags.
// This keeps output/report options out of discovery without maintaining a CLI copy.
function parseArgs(args: string[], help: string): { options: string[]; discovery: string[]; paths: string[] } {
  const flags = new Map<string, { name: string; value: boolean }>();
  for (const line of help.split("\n")) {
    const match = /^\s+(?:(-\w), )?(--[\w-]+)(?: (\w+)(\[[^\]]+\])?)?\s{2,}/.exec(line);
    if (!match) continue;
    const flag = { name: match[2], value: !!match[3] && !match[4] };
    flags.set(match[2], flag);
    if (match[1]) flags.set(match[1], flag);
  }
  const options: string[] = [], discovery: string[] = [], paths: string[] = [];
  const omitted = new Set(["--format", "--format-multi", "--output", "--report"]);
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--") { paths.push(...args.slice(i + 1)); break; }
    if (!arg.startsWith("-") || arg === "-") { paths.push(arg); continue; }
    const tokens = arg.startsWith("--") ? [arg] : arg.slice(1).split("").map(c => `-${c}`);
    for (let j = 0; j < tokens.length; j++) {
      const token = tokens[j];
      const [name] = token.split("=", 1);
      const flag = flags.get(name);
      if (!flag) throw new Error(`unknown scc option: ${name}`);
      let value: string | undefined;
      if (token.includes("=")) value = token.slice(token.indexOf("=") + 1);
      else if (!arg.startsWith("--") && arg[j + 2] === "=" && !flag.value) {
        value = arg.slice(j + 3);
        j = tokens.length;
      }
      else if (flag.value) {
        if (!arg.startsWith("--") && j + 1 < tokens.length) {
          value = arg.slice(j + 2).replace(/^=/, "");
          j = tokens.length;
        } else value = args[++i];
        if (value === undefined) throw new Error(`missing value for ${name}`);
      }
      const option = value === undefined ? flag.name : `${flag.name}=${value}`;
      options.push(option);
      if (!omitted.has(flag.name)) discovery.push(option);
    }
  }
  return { options, discovery, paths };
}

async function execute(args: string[], capture = false): Promise<{ status: number; output: string }> {
  const child = Bun.spawn(["scc", ...args], { stdin: capture ? "ignore" : "inherit", stdout: capture ? "pipe" : "inherit", stderr: "inherit" });
  const interrupt = () => child.kill("SIGINT"), terminate = () => child.kill("SIGTERM");
  process.on("SIGINT", interrupt); process.on("SIGTERM", terminate);
  try {
    const output = capture ? await new Response(child.stdout as ReadableStream).text() : "";
    return { status: await child.exited, output };
  } finally {
    process.off("SIGINT", interrupt); process.off("SIGTERM", terminate);
  }
}

async function capture(args: string[]): Promise<string> {
  const result = await execute(args, true);
  if (result.status !== 0) process.exit(result.status);
  return result.output;
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  if (args.length === 1 && args[0] === "--version") { console.log(`scc-prod ${VERSION}`); return; }
  const help = await capture(["--help"]);
  const parsed = parseArgs(args, help);
  if (parsed.options.includes("--version")) { console.log(`scc-prod ${VERSION}`); return; }
  if (parsed.options.includes("--help")) {
    console.log("scc-prod: production-oriented source counts\nUsage: scc-prod [scc options] [paths...]\nExcludes tests, examples, benchmarks, dependencies, and generated-file names/headers.\nInline tests and unmarked generated code remain counted. Requires scc.\n");
    process.stdout.write(help);
    return;
  }
  if (parsed.options.some(arg => arg === "--mcp" || arg === "--mcp=true")) {
    throw new Error("MCP serving is not a file-count invocation; use scc --mcp");
  }
  if (parsed.options.includes("--languages")) {
    process.stdout.write(await capture(args));
    return;
  }
  process.stderr.write("scc-prod: finding candidate files\n");
  const languages = JSON.parse(await capture([...DEFAULTS, ...parsed.discovery, ...DISCOVERY, "--", ...parsed.paths])) as { Files?: { Location: string }[] }[];
  const files = new Set(languages.flatMap(language => (language.Files ?? []).map(file => file.Location)));
  const exclusions: string[] = [];
  const excludedPaths = new Set<string>();
  const namePattern = new RegExp(EXCLUDED_PATH);
  const excludedDirs = new Set(EXCLUDED_DIRS.split(","));
  let headers = 0;
  for (const path of files) {
    const excludedByName = namePattern.test(path.replaceAll("\\", "/")) || path.split(/[\\/]/).slice(0, -1).some(part => excludedDirs.has(part));
    let generated = false;
    if (!excludedByName) {
      const file = await open(path, "r");
      try {
        const buffer = Buffer.alloc(16384);
        const { bytesRead } = await file.read(buffer, 0, buffer.length, 0);
        generated = generatedHeader(buffer.subarray(0, bytesRead).toString("utf8"));
      } finally { await file.close(); }
    }
    if (generated) headers++;
    if (generated || excludedByName) {
      excludedPaths.add(resolve(path));
      exclusions.push("--not-match", `^${path.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`);
    }
  }
  process.stderr.write(`scc-prod: checked ${files.size} files, excluded ${headers} generated headers and ${excludedPaths.size - headers} named files; counting\n`);
  // scc does not apply --not-match to explicitly supplied file operands.
  const paths = parsed.paths.filter(path => !excludedPaths.has(resolve(path)));
  const empty = parsed.paths.length > 0 && paths.length === 0 ? await mkdtemp(join(tmpdir(), "scc-prod-empty-")) : undefined;
  try {
    process.exitCode = (await execute([...DEFAULTS, ...exclusions, ...parsed.options, "--", ...(empty ? [empty] : paths)])).status;
  } finally { if (empty) await rm(empty, { recursive: true, force: true }); }
}

if (import.meta.main) main().catch(error => {
  console.error(`scc-prod: ${error.message}`);
  process.exitCode = 1;
});

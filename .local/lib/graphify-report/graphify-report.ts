import { dlopen, FFIType } from "bun:ffi";
import { closeSync, existsSync, mkdirSync, openSync, readFileSync, renameSync, rmSync, unlinkSync, writeFileSync } from "node:fs";
import { basename, isAbsolute, join, resolve } from "node:path";
import { exclusionMatcher, syncBuildExclusions, workspaceExclusions } from "./workspace";

export const VERSION = "1.1.0";

// Queued refreshes of one root coordinate through these graphify-out files. The
// graphify_update hook reads and clears the error record, so keep the names in step.
const QUEUE_LOCK = ".graphify-report.lock";
const QUEUE_PENDING = ".graphify-report.pending";
const QUEUE_LOG = ".graphify-report.log";
const QUEUE_ERROR = ".graphify-report.error";

type Node = {
  id: string;
  label?: string;
  source_file?: string | null;
  source_location?: string | null;
  file_type?: string;
  community?: string | number | null;
  community_name?: string;
};
type Link = { source: string; target: string; confidence?: string };
type Graph = { nodes: Node[]; links: Link[]; built_at_commit?: string };
type Entry = { node: Node; degree: number; test: boolean };

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function decodeGraph(value: unknown): Graph {
  if (!record(value) || !Array.isArray(value.nodes) || !Array.isArray(value.links ?? value.edges)) {
    throw new Error("graph must contain nodes and links arrays");
  }
  const ids = new Set<string>();
  for (const node of value.nodes) {
    if (!record(node) || typeof node.id !== "string" || ids.has(node.id)) {
      throw new Error("graph nodes must have unique string ids");
    }
    for (const key of ["label", "source_file", "source_location", "file_type", "community_name"]) {
      if (node[key] != null && typeof node[key] !== "string") throw new Error(`invalid node ${key}`);
    }
    if (node.community != null && typeof node.community !== "string" && typeof node.community !== "number") {
      throw new Error("invalid node community");
    }
    ids.add(node.id);
  }
  const links = value.links ?? value.edges;
  for (const link of links as unknown[]) {
    if (!record(link) || typeof link.source !== "string" || typeof link.target !== "string"
      || !ids.has(link.source) || !ids.has(link.target)) throw new Error("invalid graph link endpoints");
    if (link.confidence != null && typeof link.confidence !== "string") throw new Error("invalid link confidence");
  }
  return {
    nodes: value.nodes as Node[], links: links as Link[],
    built_at_commit: typeof value.built_at_commit === "string" ? value.built_at_commit : undefined,
  };
}

export function testSource(source: string): boolean {
  const parts = source.replaceAll("\\", "/").split("/");
  const file = parts.at(-1) ?? "";
  return parts.slice(0, -1).some(part => /^(tests?|specs?|__tests__|testing|testsupport)$/i.test(part))
    || /^(test_.*|conftest\.py|tests?\.rs)$/i.test(file)
    || /(?:_test|_tests|\.test|\.spec|_spec)\.[^.]+$/i.test(file)
    || /(?:Test|Tests)\.java$|Tests\.cs$/.test(file) || /\.tests\.ps1$/i.test(file);
}

function text(value: string): string {
  return value.replace(/[\r\n\t]+/g, " ").replaceAll("`", "'");
}

function sourceLink(node: Node): string {
  const source = (node.source_file ?? "").replaceAll("\\", "/");
  const line = /^(?:L)?(\d+)/.exec(node.source_location ?? "")?.[1];
  const path = source.replace(/[%#?<>]/g, char => encodeURIComponent(char));
  const target = (isAbsolute(source) ? path : `../${path}`) + (line ? `#L${line}` : "");
  const caption = text(source + (line ? `:${line}` : "")).replace(/[\[\]\\]/g, "\\$&");
  return `[${caption}](<${target}>)`;
}

export function renderReport(raw: unknown, project: string): string {
  return renderGraph(decodeGraph(raw), project);
}

function renderGraph(graph: Graph, project: string): string {
  const byId = new Map(graph.nodes.map(node => [node.id, node]));
  const degree = new Map<string, number>();
  const confidences = new Map<string, number>();
  const hints: Link[] = [];
  for (const link of graph.links) {
    degree.set(link.source, (degree.get(link.source) ?? 0) + 1);
    degree.set(link.target, (degree.get(link.target) ?? 0) + 1);
    const confidence = link.confidence ?? "EXTRACTED";
    confidences.set(confidence, (confidences.get(confidence) ?? 0) + 1);
    const from = byId.get(link.source)!;
    const to = byId.get(link.target)!;
    if (hints.length < 3 && confidence === "INFERRED" && from.source_file && to.source_file
      && from.source_file !== to.source_file) hints.push(link);
  }
  const entries: Entry[] = [];
  const communityIds = new Set<string>();
  const communities = new Map<string, Entry[]>();
  for (const node of graph.nodes) {
    if (node.community != null) communityIds.add(String(node.community));
    const source = (node.source_file ?? "").replaceAll("\\", "/");
    const label = node.label ?? node.id;
    // File hubs and sourceless reference stubs are scaffolding, not source leads.
    if (!source || node.file_type === "rationale" || label === source || source.endsWith(`/${label}`)
      || label === basename(source) || (label.startsWith(".") && label.endsWith("()"))) continue;
    const entry = { node, degree: degree.get(node.id) ?? 0, test: testSource(source) };
    entries.push(entry);
    if (node.community == null) continue;
    const cid = String(node.community);
    const members = communities.get(cid) ?? [];
    members.push(entry);
    communities.set(cid, members);
  }
  entries.sort((a, b) => b.degree - a.degree || a.node.id.localeCompare(b.node.id));
  const eligible = [...communities].filter(([, members]) => members.length >= 3);
  const lines = [
    `# Graph Report - ${text(project)}`, "", "## Summary",
    `- ${graph.nodes.length} nodes · ${graph.links.length} edges · ${communityIds.size} communities`,
    `- Extraction: ${["EXTRACTED", "INFERRED", "AMBIGUOUS"].map(key =>
      `${Math.round((confidences.get(key) ?? 0) * 100 / (graph.links.length || 1))}% ${key}`).join(" · ")}`,
    ...(graph.built_at_commit ? [`- Built from commit: \`${graph.built_at_commit.slice(0, 8)}\`; uncommitted changes may also be indexed.`] : []),
    "- Scope: this worktree/submodule only; other checkouts and Cargo workspace.exclude packages are omitted.",
    "- Coverage is limited to the existing graph; unsupported or failed extractions remain absent.",
    `- ${eligible.length} substantial communities; ${communityIds.size - eligible.length} thin communities omitted.`,
    "- Test-file paths determine the split; inline tests stay with their source file. Other sources, including docs/config, appear under Production.",
    "- Mixed communities can appear in both sections. Degree includes all connections, including production/test links.",
    "- Source links are navigation leads, not verified runtime entry points.",
  ];
  for (const isTest of [false, true]) {
    const groups = eligible.map(([cid, members]) => [cid, members.filter(entry => entry.test === isTest)
      .sort((a, b) => b.degree - a.degree || a.node.id.localeCompare(b.node.id))] as const)
      .filter(([, members]) => members.length > 0)
      .sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]));
    const selected = [];
    const seen = new Set<string>();
    for (const [cid, members] of groups) {
      const lead = members[0].node;
      if (seen.has(lead.source_file!)) continue;
      seen.add(lead.source_file!);
      selected.push(`- **${cid}: \`${text(lead.community_name ?? `Community ${cid}`)}\`** (${members.length} symbols): `
        + `\`${text(lead.label ?? lead.id)}\` - ${sourceLink(lead)}`);
      if (selected.length === 6) break;
    }
    lines.push("", `## ${isTest ? "Tests" : "Production"}`,
      `### Communities and entry points (${selected.length} of ${groups.length})`,
      ...(selected.length ? selected : ["- None in substantial communities."]), "", "### God Nodes (most connected)");
    const gods = entries.filter(entry => entry.test === isTest && entry.node.file_type === "code"
      && !/\.(json|ya?ml|toml)$/i.test(entry.node.source_file ?? "")).slice(0, 3);
    for (const [i, entry] of gods.entries()) {
      lines.push(`${i + 1}. \`${text(entry.node.label ?? entry.node.id)}\` - ${entry.degree} edges - ${sourceLink(entry.node)}`);
    }
    if (!gods.length) lines.push("- None detected.");
  }
  if (hints.length) {
    lines.push("", "## Cross-source Connections", "Inferred graph hints; verify in source before relying on them.");
    for (const link of hints) {
      const from = byId.get(link.source)!;
      const to = byId.get(link.target)!;
      lines.push(`- \`${text(from.label ?? from.id)}\` → \`${text(to.label ?? to.id)}\`: ${sourceLink(from)} → ${sourceLink(to)}`);
    }
  }
  lines.push("", "## Explore Further", "The complete graph and its connections are unchanged; inventories are intentionally omitted here.",
    '- `graphify query "<question>" --budget 1500` - find relevant communities and declarations.',
    '- `graphify explain "<symbol>"` - inspect a node and its neighbors.',
    '- `graphify path "<from>" "<to>"` - trace a connection.', "");
  return lines.join("\n");
}

function writeAtomic(target: string, content: string): void {
  const temporary = `${target}.tmp.${process.pid}`;
  try {
    writeFileSync(temporary, content);
    renameSync(temporary, target);
  } finally {
    try { unlinkSync(temporary); } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }
  }
}

export function writeReport(root: string, rules = workspaceExclusions(root)): string {
  const directory = join(resolve(root), "graphify-out");
  const graph = decodeGraph(JSON.parse(readFileSync(join(directory, "graph.json"), "utf8")));
  const excluded = exclusionMatcher(rules, resolve(root));
  const nodes = graph.nodes.filter(node => !node.source_file || !excluded(node.source_file));
  const ids = new Set(nodes.map(node => node.id));
  const links = graph.links.filter(link => ids.has(link.source) && ids.has(link.target));
  const report = renderGraph({ ...graph, nodes, links }, basename(resolve(root)));
  writeAtomic(join(directory, "GRAPH_REPORT.md"), report);
  return report;
}

function updateReport(root: string, output: "inherit" | number): string {
  const rules = workspaceExclusions(root);
  const changed = syncBuildExclusions(root, rules);
  const result = Bun.spawnSync(["graphify", "update", root, ...(changed ? ["--force"] : [])],
    { cwd: root, stdout: output, stderr: output });
  if (result.exitCode !== 0) throw new Error(`graphify update failed (exit ${result.exitCode})`);
  return writeReport(root, rules);
}

// Non-blocking exclusive flock; the kernel releases it when the descriptor closes or the process exits.
function tryLock(path: string): number | undefined {
  const libc = dlopen(process.platform === "darwin" ? "libSystem.B.dylib" : "libc.so.6",
    { flock: { args: [FFIType.i32, FFIType.i32], returns: FFIType.i32 } });
  const descriptor = openSync(path, "a");
  if (libc.symbols.flock(descriptor, 2 /* LOCK_EX */ | 4 /* LOCK_NB */) === 0) return descriptor;
  closeSync(descriptor);
  return undefined;
}

// Record a refresh request and return when another process holds the root: that
// holder repeats its refresh until no request remains, so a burst costs at most
// one extra refresh. The request is written before locking, and rechecked after
// release, so a request racing the holder's exit is never stranded.
function queueUpdate(root: string): void {
  const directory = join(root, "graphify-out");
  mkdirSync(directory, { recursive: true });
  const pending = join(directory, QUEUE_PENDING);
  const failure = join(directory, QUEUE_ERROR);
  const logPath = join(directory, QUEUE_LOG);
  do {
    writeFileSync(pending, "");
    const lock = tryLock(join(directory, QUEUE_LOCK));
    if (lock === undefined) return;
    try {
      while (existsSync(pending)) {
        unlinkSync(pending);
        const log = openSync(logPath, "w");
        try {
          updateReport(root, log);
          rmSync(failure, { force: true });
        } catch (error) {
          writeAtomic(failure, `graphify-report: ${error instanceof Error ? error.message : String(error)}; see ${logPath}\n`);
        } finally {
          closeSync(log);
        }
      }
    } finally {
      closeSync(lock);
    }
  } while (existsSync(pending));
}

const USAGE = "Usage: graphify-report [--update [--queue]] [PROJECT_ROOT]";

if (import.meta.main) {
  try {
    const args = process.argv.slice(2);
    if (args.length === 1 && args[0] === "--version") console.log(VERSION);
    else if (args.length === 1 && args[0] === "--help") {
      console.log(`${USAGE}\nRender a compact Production/Tests report from the existing graph.\n--update: apply checkout boundaries and Cargo workspace.exclude through generated Graphify build metadata before extraction. Source ignore files are untouched; default-members are not exclusions.\n--queue: coalesce with other queued updates of the same root and return at once while one is running; the running update repeats until no request remains. Graphify output goes to graphify-out/${QUEUE_LOG}, and a failure is recorded in graphify-out/${QUEUE_ERROR} until an update succeeds.`);
    } else {
      const update = args[0] === "--update";
      const queue = update && args[1] === "--queue";
      const positional = args.slice(Number(update) + Number(queue));
      if (positional.length > 1 || positional[0]?.startsWith("-")) throw new Error(USAGE);
      const root = resolve(positional[0] ?? process.cwd());
      if (queue) queueUpdate(root);
      else {
        const report = update ? updateReport(root, "inherit") : writeReport(root);
        console.log(`${join(root, "graphify-out", "GRAPH_REPORT.md")} (${report.trimEnd().split("\n").length} lines)`);
      }
    }
  } catch (error) {
    console.error(`graphify-report: ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  }
}

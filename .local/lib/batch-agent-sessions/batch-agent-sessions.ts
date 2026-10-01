import { spawnSync } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import { closeSync, existsSync, fsyncSync, lstatSync, mkdirSync, mkdtempSync, openSync, readFileSync, realpathSync, renameSync, rmdirSync, statSync, unlinkSync, writeFileSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { dirname, isAbsolute, join, resolve } from "node:path";
import { parseArgs } from "node:util";

export const VERSION = "1.0.0";
export type Runner = (argv: string[], cwd: string) => string;
export type Context = {
  base_commit: string; source_workspace_id: string; source_checkout_path: string;
  caller_pane: string; dirty_status?: string[];
};
export type Discovery = (cwd: string) => Context;
type Plan = { batches: { name: string }[]; setup?: string[][]; evidence?: { name: string; source: string }[] };
type Batch = { name: string; branch: string; path: string; state: "pending" | "creating" | "created" | "prepared" | "removing" | "removed";
  workspace?: string; pane?: string; error?: string; retained_tip?: string; ready_unknown?: boolean };
type Evidence = { name: string; source: string; path: string; sha256: string };
export type Manifest = { version: 1; run_id: string; source: string; base_commit: string;
  source_workspace: string; caller_pane: string; preflight: Context; temporary_root: string;
  temporary_identity: { dev: number; ino: number }; temporary_state: "retained" | "removed";
  evidence: Evidence[]; batches: Batch[]; errors: string[] };
type Workspace = { workspace: { worktree?: { checkout_path: string; is_linked_worktree: boolean } } };
type Pane = { pane_id: string };
type Agent = { pane_id: string; agent_status: string };

const batchName = /^[a-z][a-z0-9-]{0,39}$/;
const message = (error: unknown): string => error instanceof Error ? error.message : String(error);
const digest = (bytes: Uint8Array): string => createHash("sha256").update(bytes).digest("hex");

export function run(argv: string[], cwd: string): string {
  const result = spawnSync(argv[0], argv.slice(1), { cwd, encoding: "utf8", timeout: 600_000, maxBuffer: 32 * 1024 * 1024 });
  if (result.error || result.status !== 0) throw new Error(`${argv[0]} ${argv[1] ?? ""}: ${result.error?.message ?? (result.stderr.trim().slice(0, 1500) || `exit ${result.status}`)}`);
  return result.stdout.trimEnd();
}

function response<T>(runner: Runner, argv: string[], cwd: string): T {
  const value = JSON.parse(runner(["herdr", ...argv], cwd));
  if (value.error || !value.result) throw new Error(value.error?.message ?? "Herdr returned no result");
  return value.result;
}

function save(manifest: Manifest, path: string): void {
  const temporary = `${path}.${randomUUID()}.tmp`;
  const fd = openSync(temporary, "wx", 0o600);
  try { writeFileSync(fd, `${JSON.stringify(manifest, null, 2)}\n`); fsyncSync(fd); }
  finally { closeSync(fd); }
  renameSync(temporary, path);
}

export function discover(cwd: string): Context {
  if (process.env.HERDR_ENV !== "1") throw new Error("Not inside a Herdr-managed pane (HERDR_ENV must be 1).");
  // The existing single-session preflight remains the discovery owner.
  const output = run(["skills-mgr", "run", "new-agent-session/scripts/preflight.py", "--cwd", cwd], cwd);
  const fields: Record<string, unknown> = {};
  for (const line of output.split("\n")) {
    const match = /^(\w+): (.+)$/.exec(line);
    if (match && match[1] !== "cli") fields[match[1]] = JSON.parse(match[2]);
  }
  for (const name of ["base_commit", "source_workspace_id", "source_checkout_path", "caller_pane"]) {
    if (typeof fields[name] !== "string" || !fields[name]) throw new Error(`preflight did not establish ${name}`);
  }
  return fields as Context;
}

function validatePlan(value: unknown): Plan {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("plan must be a JSON object");
  const plan = value as Plan;
  if (!Array.isArray(plan.batches) || !plan.batches.length) throw new Error("plan.batches must be a nonempty list");
  const names = new Set<string>();
  for (const batch of plan.batches) {
    if (!batch || typeof batch.name !== "string" || !batchName.test(batch.name) || names.has(batch.name)) throw new Error("invalid or duplicate batch name");
    names.add(batch.name);
  }
  if (plan.setup !== undefined && (!Array.isArray(plan.setup) || plan.setup.some(command => !Array.isArray(command) || !command.length || command.some(arg => typeof arg !== "string" || !arg)))) {
    throw new Error("setup commands must be nonempty argv lists, not shell strings");
  }
  if (plan.evidence !== undefined && !Array.isArray(plan.evidence)) throw new Error("evidence must be a list");
  names.clear();
  for (const item of plan.evidence ?? []) {
    if (!item || typeof item.name !== "string" || !/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(item.name) || names.has(item.name)) throw new Error("invalid or duplicate evidence name");
    if (typeof item.source !== "string" || !isAbsolute(item.source)) throw new Error("evidence.source must be an absolute file path");
    names.add(item.name);
  }
  return plan;
}

function recoverImages(rollout: string | undefined, requested: Set<string>): Map<string, Buffer> {
  const images = new Map<string, Buffer>();
  if (!rollout || !requested.size) return images;
  for (const line of readFileSync(rollout, "utf8").split("\n")) {
    if (!line.trim()) continue;
    let record;
    try { record = JSON.parse(line); } catch { throw new Error("retained rollout contains invalid JSON"); }
    const payload = record.payload;
    if (record.type !== "response_item" || payload?.role !== "user") continue;
    let source: string | undefined;
    for (const content of payload.content ?? []) {
      if (typeof content.text === "string") {
        // Codex emits the literal path, including quotes or newlines, inside this complete marker.
        const marker = /^<image(?: name=\[Image #\d+\])? path="([\s\S]*)">$/.exec(content.text);
        source = marker?.[1];
      } else if (content.type === "input_image") {
        if (source && requested.has(source)) {
          const match = /^data:image\/[\w.+-]+;base64,([A-Za-z0-9+/]*={0,2})$/.exec(content.image_url ?? "");
          if (!match) throw new Error(`${source}: retained image is not valid embedded image data`);
          const bytes = Buffer.from(match[1], "base64");
          if (bytes.toString("base64").replace(/=+$/, "") !== match[1].replace(/=+$/, "")) throw new Error(`${source}: invalid retained image encoding`);
          if (images.has(source) && !images.get(source)!.equals(bytes)) throw new Error(`${source}: ambiguous retained images`);
          images.set(source, bytes);
        }
        source = undefined;
      }
    }
  }
  return images;
}

function commonDirectory(runner: Runner, cwd: string): string {
  return runner(["git", "rev-parse", "--path-format=absolute", "--git-common-dir"], cwd);
}

export function prepare(value: unknown, cwd: string, runner: Runner = run, discovery: Discovery = discover, rollout?: string): { manifestPath: string; manifest: Manifest; errors: string[] } {
  if (process.env.HERDR_ENV !== "1") throw new Error("Not inside a Herdr-managed pane (HERDR_ENV must be 1).");
  const plan = validatePlan(value);
  const context = discovery(cwd);
  if (!/^[0-9a-f]{40,64}$/.test(context.base_commit) || !context.source_workspace_id) throw new Error("preflight did not establish a shared base and source workspace");
  if (!context.source_checkout_path || commonDirectory(runner, cwd) !== commonDirectory(runner, context.source_checkout_path)) throw new Error("caller checkout and Herdr source workspace belong to different repositories");
  const state = process.env.XDG_STATE_HOME ?? join(homedir(), ".local/state");
  if (!isAbsolute(state)) throw new Error("XDG_STATE_HOME must be absolute");
  const manifests = join(state, "batch-agent-sessions/runs");
  mkdirSync(manifests, { recursive: true, mode: 0o700 });
  const root = realpathSync(mkdtempSync(join(tmpdir(), "agent-batches-")));
  const runId = randomUUID().replaceAll("-", "");
  const identity = statSync(root);
  const manifestPath = join(manifests, `${runId}.json`);
  const errors: string[] = [];
  const manifest: Manifest = { version: 1, run_id: runId, source: cwd, base_commit: context.base_commit,
    source_workspace: context.source_workspace_id, caller_pane: context.caller_pane, preflight: context,
    temporary_root: root, temporary_identity: { dev: identity.dev, ino: identity.ino }, temporary_state: "retained",
    evidence: [], errors, batches: plan.batches.map(batch => ({ name: batch.name,
      branch: `fix/batch-${batch.name}-${runId.slice(0, 12)}`, path: join(root, "worktrees", batch.name), state: "pending" })) };
  save(manifest, manifestPath);
  mkdirSync(join(root, "evidence"));
  const missing = new Set((plan.evidence ?? []).filter(item => !existsSync(item.source)).map(item => item.source));
  let images = new Map<string, Buffer>();
  try { images = recoverImages(rollout, missing); } catch (error) { errors.push(`rollout recovery: ${message(error)}`); }
  for (const item of plan.evidence ?? []) {
    try {
      const bytes = existsSync(item.source) ? readFileSync(item.source) : images.get(item.source);
      if (!bytes) throw new Error("source missing and no matching embedded rollout image is recoverable");
      const path = join(root, "evidence", item.name);
      writeFileSync(path, bytes, { flag: "wx", mode: 0o600 });
      manifest.evidence.push({ ...item, path, sha256: digest(bytes) });
    } catch (error) { errors.push(`evidence ${item.name}: ${message(error)}`); }
  }
  save(manifest, manifestPath);
  // Required missing evidence stops dependent setup, not independent successful copies.
  if (!errors.length) {
    mkdirSync(join(root, "worktrees"));
    for (const batch of manifest.batches) {
      try {
        batch.state = "creating";
        save(manifest, manifestPath);
        console.error(`${batch.name}: creating shared-base worktree`);
        const created = response<{ workspace: { workspace_id: string }; root_pane: { pane_id: string }; worktree: { path: string } }>(runner,
          ["worktree", "create", "--workspace", manifest.source_workspace, "--branch", batch.branch, "--base", manifest.base_commit,
            "--path", batch.path, "--label", batch.name, "--no-focus"], cwd);
        batch.workspace = created.workspace.workspace_id;
        batch.pane = created.root_pane.pane_id;
        batch.state = "created";
        save(manifest, manifestPath);
        if (realpathSync(created.worktree.path) !== batch.path) throw new Error("creation returned a different checkout path");
        if (runner(["git", "rev-parse", "HEAD"], batch.path) !== manifest.base_commit) throw new Error("checkout HEAD differs from shared base");
        for (const command of plan.setup ?? []) {
          console.error(`${batch.name}: project setup (${command[0]})`);
          runner(command, batch.path);
        }
        batch.state = "prepared";
      } catch (error) {
        batch.error = message(error);
        errors.push(`${batch.name}: ${batch.error}`);
      }
      save(manifest, manifestPath);
    }
  }
  return { manifestPath, manifest, errors };
}

function checkTemporaryIdentity(manifest: Manifest): void {
  const root = manifest.temporary_root;
  if (realpathSync(root) !== root) throw new Error("temporary root is no longer its recorded directory");
  const current = statSync(root);
  if (current.dev !== manifest.temporary_identity.dev || current.ino !== manifest.temporary_identity.ino) throw new Error("temporary root identity changed");
}

function removeTemporaryArtifacts(manifest: Manifest): void {
  const root = manifest.temporary_root;
  if (manifest.temporary_state === "removed") return;
  checkTemporaryIdentity(manifest);
  for (const item of manifest.evidence) {
    if (item.path !== join(root, "evidence", item.name)) throw new Error("evidence path differs from its receipt");
    if (!existsSync(item.path)) continue;
    if (realpathSync(item.path) !== item.path || digest(readFileSync(item.path)) !== item.sha256) throw new Error(`evidence ${item.name} changed; preserve temporary artifacts`);
  }
  for (const item of manifest.evidence) if (existsSync(item.path)) unlinkSync(item.path);
  for (const directory of [join(root, "evidence"), join(root, "worktrees")]) if (existsSync(directory)) rmdirSync(directory);
  rmdirSync(root); // Unknown files prevent removal instead of being recursively discarded.
  manifest.temporary_state = "removed";
}

export function cleanup(manifestPath: string, completed: string[], runner: Runner = run, readyUnknown: string[] = []): { manifest: Manifest; errors: string[] } {
  if (process.env.HERDR_ENV !== "1") throw new Error("Not inside a Herdr-managed pane (HERDR_ENV must be 1).");
  const manifest: Manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  if (manifest.version !== 1) throw new Error("unsupported manifest version");
  if (manifest.temporary_state !== "removed") checkTemporaryIdentity(manifest);
  const batches = new Map(manifest.batches.map(batch => [batch.name, batch]));
  const errors: string[] = [];
  const confirmedReady = new Set(readyUnknown);
  for (const name of confirmedReady) if (!completed.includes(name)) errors.push(`${name}: ready-unknown requires a completed selection`);
  for (const name of new Set(completed)) {
    const batch = batches.get(name);
    if (!batch) { errors.push(`${name}: unknown batch`); continue; }
    if (batch.state === "removed") continue;
    try {
      const expected = join(manifest.temporary_root, "worktrees", name);
      if (!batchName.test(name) || batch.path !== expected || !batch.workspace || !batch.pane) throw new Error("missing or mismatched creation receipt; inspect preparation outcome");
      if (batch.state === "removing" && !lstatSync(expected, { throwIfNoEntry: false })) {
        const registered = runner(["git", "worktree", "list", "--porcelain", "-z"], manifest.source).split("\0");
        const { workspaces } = response<{ workspaces: { workspace_id: string }[] }>(runner, ["workspace", "list"], manifest.source);
        if (registered.includes(`worktree ${expected}`) || workspaces.some(workspace => workspace.workspace_id === batch.workspace)) throw new Error("removal is not confirmed; preserve uncertain resources");
        if (!batch.retained_tip || runner(["git", "rev-parse", `refs/heads/${batch.branch}`], manifest.source) !== batch.retained_tip) throw new Error("retained branch changed after uncertain removal");
        batch.state = "removed";
        delete batch.error;
        save(manifest, manifestPath);
        continue;
      }
      if (realpathSync(expected) !== expected) throw new Error("recorded checkout traverses a symlink");
      const { workspace } = response<Workspace>(runner, ["workspace", "get", batch.workspace], manifest.source);
      if (!workspace.worktree?.is_linked_worktree || workspace.worktree.checkout_path !== expected) throw new Error("live workspace is not the recorded linked checkout");
      if (commonDirectory(runner, expected) !== commonDirectory(runner, manifest.source)) throw new Error("checkout belongs to a different source repository");
      if (runner(["git", "symbolic-ref", "--short", "HEAD"], expected) !== batch.branch) throw new Error("checkout branch changed; preserve it");
      if (runner(["git", "status", "--porcelain"], expected)) throw new Error("worktree has uncommitted files; preserve it");
      const tip = runner(["git", "rev-parse", "HEAD"], expected);
      if (runner(["git", "rev-parse", `refs/heads/${batch.branch}`], manifest.source) !== tip) throw new Error("branch does not retain checkout tip");
      const { panes } = response<{ panes: Pane[] }>(runner, ["pane", "list", "--workspace", batch.workspace], manifest.source);
      if (panes.length !== 1 || panes[0].pane_id !== batch.pane) throw new Error("workspace layout changed; preserve unowned panes");
      const { agents } = response<{ agents: Agent[] }>(runner, ["agent", "list"], manifest.source);
      const agent = agents.find(agent => agent.pane_id === batch.pane);
      const readyUnknown = agent?.agent_status === "unknown" && confirmedReady.has(name);
      if (agent && !["idle", "done"].includes(agent.agent_status) && !readyUnknown) throw new Error("agent is not settled; preserve unfinished work (unknown requires inspected-ready confirmation with --ready-unknown)");
      if (!agent) {
        const { process_info: process } = response<{ process_info: { shell_pid: number; foreground_process_group_id: number } }>(runner, ["pane", "process-info", "--pane", batch.pane], manifest.source);
        if (!process.shell_pid || process.foreground_process_group_id !== process.shell_pid) throw new Error("pane has a foreground command; preserve unfinished work");
      }
      console.error(`${name}: removing completed worktree; retaining branch ${batch.branch}`);
      batch.retained_tip = tip;
      if (readyUnknown) batch.ready_unknown = true;
      batch.state = "removing";
      save(manifest, manifestPath);
      const removed = response<{ path: string; forced: boolean }>(runner, ["worktree", "remove", "--workspace", batch.workspace], manifest.source);
      if (removed.path !== expected || removed.forced !== false) throw new Error("unexpected removal receipt; inspect actual outcome");
      if (runner(["git", "rev-parse", `refs/heads/${batch.branch}`], manifest.source) !== tip) throw new Error("retained branch changed during removal");
      batch.state = "removed";
      delete batch.error;
    } catch (error) { batch.error = message(error); errors.push(`${name}: ${batch.error}`); }
    save(manifest, manifestPath);
  }
  if (manifest.batches.every(batch => batch.state === "removed")) {
    try { removeTemporaryArtifacts(manifest); } catch (error) { errors.push(`temporary artifacts: ${message(error)}`); }
  }
  manifest.errors = errors;
  save(manifest, manifestPath);
  return { manifest, errors };
}

function main(): number {
  const { values, positionals } = parseArgs({ allowPositionals: true, options: {
    cwd: { type: "string" }, plan: { type: "string" }, rollout: { type: "string" }, manifest: { type: "string" },
    completed: { type: "string", multiple: true }, "ready-unknown": { type: "string", multiple: true }, version: { type: "boolean" }, help: { type: "boolean" },
  } });
  if (values.version) { console.log(VERSION); return 0; }
  if (values.help) {
    console.log("batch-agent-sessions prepare --cwd DIR --plan FILE|- [--rollout PATH]\nbatch-agent-sessions cleanup --manifest PATH --completed NAME [--completed NAME ...] [--ready-unknown NAME ...]");
    return 0;
  }
  let manifestPath: string, manifest: Manifest, errors: string[];
  if (positionals[0] === "prepare" && positionals.length === 1 && values.cwd && values.plan) {
    const input = readFileSync(values.plan === "-" ? 0 : values.plan, "utf8");
    ({ manifestPath, manifest, errors } = prepare(JSON.parse(input), realpathSync(values.cwd), run, discover, values.rollout));
  } else if (positionals[0] === "cleanup" && positionals.length === 1 && values.manifest && values.completed?.length) {
    manifestPath = realpathSync(values.manifest);
    ({ manifest, errors } = cleanup(manifestPath, values.completed, run, values["ready-unknown"]));
  } else throw new Error("use --help for prepare/cleanup arguments");
  console.log(JSON.stringify({ manifest: manifestPath, base_commit: manifest.base_commit, temporary_root: manifest.temporary_root,
    temporary_state: manifest.temporary_state, evidence: manifest.evidence, batches: manifest.batches }));
  for (const error of errors) console.error(error);
  return Number(errors.length > 0);
}

if (import.meta.main) {
  try { process.exitCode = main(); } catch (error) { console.error(message(error)); process.exitCode = 1; }
}

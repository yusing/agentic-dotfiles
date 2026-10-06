import { spawn, spawnSync } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import { closeSync, existsSync, fsyncSync, lstatSync, mkdirSync, mkdtempSync, openSync, readFileSync, readdirSync, realpathSync, renameSync, rmdirSync, statSync, unlinkSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { isAbsolute, join } from "node:path";
import { parseArgs } from "node:util";

export const VERSION = "1.2.5";
export type Runner = (argv: string[], cwd: string) => string;
export type Context = {
  base_commit: string; source_workspace_id: string; source_checkout_path: string;
  caller_pane: string; dirty_status?: string[];
  caller_kind?: string; caller_uses_mekugi?: boolean; mekugi_executable?: string; mekugi_flags?: string[];
};
export type Discovery = (cwd: string) => Context;
type Route = { kind: string; model?: string; effort?: string; profile?: string; args?: string[];
  model_reason?: string; effort_reason?: string; allow_yolo?: boolean };
type Assignment = { name: string; task?: string; handoff?: string; agent?: Route };
type Plan = { batches: Assignment[]; base_commit?: string; setup?: string[][]; evidence?: { name: string; source: string }[] };
type Batch = { name: string; branch: string; path: string; state: "pending" | "creating" | "created" | "prepared" | "removing" | "removed";
  workspace?: string; pane?: string; error?: string; retained_tip?: string; ready_unknown?: boolean;
  base_commit?: string; task?: string; handoff?: string; agent?: Route;
  submodules?: { path: string; commit: string; branch: string; source_branch?: string }[]; retained_submodules?: { path: string; commit: string; ref: string }[];
  launch?: { state: "starting" | "started" | "verified"; name: string; pid?: number; session?: string; model?: string; effort?: string } };
type Task = { id: string; batch: string; task: string; handoff?: string;
  state: "queued" | "submitting" | "working" | "cancelled"; error?: string };
type Evidence = { name: string; source: string; path: string; sha256: string };
export type Manifest = { version: 1; run_id: string; source: string; base_commit: string;
  source_workspace: string; caller_pane: string; preflight: Context; temporary_root: string;
  temporary_identity: { dev: number; ino: number }; temporary_state: "retained" | "removed";
  evidence: Evidence[]; batches: Batch[]; errors: string[]; tasks?: Task[] };
type Workspace = { workspace: { worktree?: { checkout_path: string; is_linked_worktree: boolean } } };
type Pane = { pane_id: string };
type Agent = { pane_id: string; agent_status: string; name?: string; agent?: string; cwd?: string; foreground_cwd?: string;
  agent_session?: { value: string }; revision?: number };
type Process = { name: string; pid: number; cwd: string; argv: string[] };
type ProcessInfo = { shell_pid: number; foreground_process_group_id: number; foreground_processes?: Process[] };
export type AsyncRunner = (argv: string[], cwd: string, signal: AbortSignal) => Promise<string>;

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
    if (batch.task !== undefined && (typeof batch.task !== "string" || !batch.task.trim())) throw new Error(`${batch.name}: task must be nonempty text`);
    if (batch.handoff !== undefined && typeof batch.handoff !== "string") throw new Error(`${batch.name}: handoff must be text`);
    const route = batch.agent;
    if (route !== undefined) {
      if (!route || typeof route !== "object" || typeof route.kind !== "string" || !/^[a-z][a-z0-9-]*$/.test(route.kind)) throw new Error(`${batch.name}: invalid agent kind`);
      for (const key of ["model", "effort", "profile", "model_reason", "effort_reason"] as const) {
        if (route[key] !== undefined && (typeof route[key] !== "string" || !route[key]!.trim())) throw new Error(`${batch.name}: ${key} must be nonempty text`);
      }
      if (route.args !== undefined && (!Array.isArray(route.args) || route.args.some(arg => typeof arg !== "string"))) throw new Error(`${batch.name}: agent.args must be native argv strings`);
      if (!["mekugi", "codex"].includes(route.kind) && (route.model || route.effort || route.profile)) throw new Error(`${batch.name}: non-Codex budgets and profiles belong in native agent.args`);
      if (route.effort && !["low", "medium", "high", "xhigh", "max"].includes(route.effort)) throw new Error(`${batch.name}: invalid Codex effort`);
      if (route.allow_yolo !== undefined && typeof route.allow_yolo !== "boolean") throw new Error(`${batch.name}: allow_yolo must be boolean`);
    }
  }
  if (plan.base_commit !== undefined && !/^[0-9a-f]{40,64}$/.test(plan.base_commit)) throw new Error("base_commit must be a resolved commit ID");
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
  return { ...plan, batches: plan.batches.map(({ name, task, handoff, agent }) => ({ name, task, handoff, agent })) };
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

const populated = (path: string): boolean => existsSync(join(path, ".git"));

// Every gitlink in the tree, named by the .gitmodules entry that maps its path, when one does.
function gitlinks(runner: Runner, repo: string, revision: string): { name?: string; path: string; commit: string }[] {
  const names = new Map<string, string>();
  let declared = true;
  try { runner(["git", "cat-file", "-e", `${revision}:.gitmodules`], repo); } catch { declared = false; }
  if (declared) for (const entry of runner(["git", "config", "--blob", `${revision}:.gitmodules`, "-z", "--list"], repo).split("\0")) {
    const match = /^submodule\.([\s\S]+)\.path\n([\s\S]*)$/.exec(entry);
    if (match) names.set(match[2], match[1]);
  }
  const links = [];
  for (const entry of runner(["git", "ls-tree", "-r", "-z", revision], repo).split("\0")) {
    const match = /^160000 commit ([0-9a-f]{40,64})\t([\s\S]+)$/.exec(entry);
    if (match) links.push({ name: names.get(match[2]), path: match[2], commit: match[1] });
  }
  return links;
}

function contains(runner: Runner, repo: string, commit: string): boolean {
  try { return Boolean(runner(["git", "for-each-ref", "--contains", commit, "--count=1", "--format=%(refname)"], repo)); }
  catch { return false; } // The commit is absent from this repository.
}

// Mirror the source checkout's initialized submodules at the recorded commits. Clone them from the
// local source repositories, which can hold pinned commits that were never published upstream.
function initSubmodules(runner: Runner, batch: Batch, checkout: string, source: string, prefix = ""): void {
  for (const link of gitlinks(runner, checkout, "HEAD")) {
    const local = join(source, link.path), nested = join(checkout, link.path), path = prefix + link.path;
    if (!link.name || !populated(local)) continue;
    const current = runner(["git", "rev-parse", "HEAD"], local);
    let sourceBranch: string | undefined;
    try { sourceBranch = runner(["git", "symbolic-ref", "--quiet", "--short", "HEAD"], local); } catch { /* Source was already detached; integration must resolve its original branch. */ }
    if (current !== link.commit) console.error(`${batch.name}: submodule ${path} uses recorded ${link.commit.slice(0, 12)}, not the source checkout's ${current.slice(0, 12)}`);
    console.error(`${batch.name}: initializing submodule ${path}`);
    runner(["git", "submodule", "init", "--", link.path], checkout);
    const url = runner(["git", "config", "--get", `submodule.${link.name}.url`], checkout);
    let cloned = true;
    try { runner(["git", "-c", "protocol.file.allow=always", "-c", `submodule.${link.name}.url=${local}`, "submodule", "update", "--", link.path], checkout); }
    catch { cloned = false; }
    if (populated(nested)) runner(["git", "remote", "set-url", "origin", url], nested);
    if (!cloned) {
      console.error(`${batch.name}: submodule ${path} lacks ${link.commit.slice(0, 12)} locally; fetching from ${url}`);
      runner(["git", "submodule", "update", "--", link.path], checkout);
    }
    if (!populated(nested)) { console.error(`${batch.name}: submodule ${path} stays uninitialized by its update setting`); continue; }
    runner(["git", "switch", "--no-track", "-c", batch.branch, link.commit], nested);
    (batch.submodules ??= []).push({ path, commit: link.commit, branch: batch.branch, ...(sourceBranch ? { source_branch: sourceBranch } : {}) });
    initSubmodules(runner, batch, nested, local, `${path}/`);
  }
}

// Forced removal discards the checkout's submodule repositories and everything only they hold.
// Each populated one must be clean, at its recorded commit, without a stash, and without branch or
// tag commits outside its recorded and remote-tracking history. A changed recorded commit is kept in the matching source
// submodule under the batch branch name.
function retainSubmodules(runner: Runner, batch: Batch, checkout: string, source: string, base: string | undefined, prefix = ""): { path: string; commit: string; ref: string }[] {
  const links = gitlinks(runner, checkout, "HEAD");
  const inspected = new Set(links.filter(link => populated(join(checkout, link.path))).map(link =>
    realpathSync(runner(["git", "rev-parse", "--absolute-git-dir"], join(checkout, link.path)))));
  // Removed or deinitialized modules still have repositories under modules/. They are not
  // covered by the live-gitlink checks below, so preserve them rather than force-delete them.
  const modules = runner(["git", "rev-parse", "--path-format=absolute", "--git-path", "modules"], checkout);
  const checkStored = (path: string): void => {
    const info = lstatSync(path, { throwIfNoEntry: false });
    if (!info) return;
    if (!info.isDirectory()) throw new Error(`uninspected submodule storage ${path}; preserve the checkout and recover or remove this storage explicitly`);
    if (inspected.has(realpathSync(path))) return;
    for (const entry of readdirSync(path)) checkStored(join(path, entry));
  };
  checkStored(modules);
  let before = new Map<string, string>();
  if (base) try { before = new Map(gitlinks(runner, checkout, base).map(link => [link.path, link.commit])); } catch { /* unknown base: every gitlink counts as changed */ }
  const retained = [], ref = `refs/heads/${batch.branch}`;
  for (const link of links) {
    const local = join(source, link.path), nested = join(checkout, link.path), path = prefix + link.path;
    const changed = before.get(link.path) !== link.commit;
    if (!populated(nested)) {
      if (changed) throw new Error(`changed submodule ${path} is not populated; preserve it`);
      continue;
    }
    if (!link.name) throw new Error(`gitlink ${path} has no .gitmodules entry; preserve it`);
    if (runner(["git", "rev-parse", "HEAD"], nested) !== link.commit) throw new Error(`submodule ${path} is not at its recorded commit; preserve it`);
    if (runner(["git", "status", "--porcelain", "--ignore-submodules=none"], nested)) throw new Error(`submodule ${path} has uncommitted files; preserve it`);
    if (changed) {
      if (!populated(local)) throw new Error(`changed submodule ${path} is not initialized in the source checkout; integrate its commits or preserve it`);
      if (!contains(runner, local, link.commit)) runner(["git", "fetch", "--no-tags", "--no-recurse-submodules", "--no-write-fetch-head", nested, `HEAD:${ref}`], local);
      let tip = "";
      try { tip = runner(["git", "rev-parse", "--verify", "--quiet", ref], local); } catch { /* reachable from other refs */ }
      if (tip === link.commit) retained.push({ path, commit: link.commit, ref });
    }
    let stash = false;
    try { runner(["git", "rev-parse", "--verify", "--quiet", "refs/stash"], nested); stash = true; } catch { /* no stash */ }
    if (stash) throw new Error(`submodule ${path} has a stash; preserve it`);
    // Remote-tracking refs are the source's branches at clone time, or upstream's after a fallback fetch.
    const known = [link.commit, ...(before.has(link.path) ? [before.get(link.path)!] : [])];
    const unrecorded = runner(["git", "rev-list", "-n1", "--branches", "--tags", "--not", "--remotes", ...known], nested);
    if (unrecorded) throw new Error(`submodule ${path} has branch or tag commit ${unrecorded.slice(0, 12)} outside its recorded and remote history; integrate or delete it`);
    retained.push(...retainSubmodules(runner, batch, nested, local, before.get(link.path), `${path}/`));
  }
  return retained;
}

export function prepare(value: unknown, cwd: string, runner: Runner = run, discovery: Discovery = discover, rollout?: string): { manifestPath: string; manifest: Manifest; errors: string[] } {
  if (process.env.HERDR_ENV !== "1") throw new Error("Not inside a Herdr-managed pane (HERDR_ENV must be 1).");
  const plan = validatePlan(value);
  const context = discovery(cwd);
  if (plan.base_commit && plan.base_commit !== context.base_commit) throw new Error("initial preparation must use the preflight base");
  if (!/^[0-9a-f]{40,64}$/.test(context.base_commit) || !context.source_workspace_id) throw new Error("preflight did not establish a shared base and source workspace");
  if (!context.source_checkout_path || commonDirectory(runner, cwd) !== commonDirectory(runner, context.source_checkout_path)) throw new Error("caller checkout and Herdr source workspace belong to different repositories");
  const state = process.env.XDG_STATE_HOME ?? join(homedir(), ".local/state");
  if (!isAbsolute(state)) throw new Error("XDG_STATE_HOME must be absolute");
  const manifests = join(state, "batch-agent-sessions/runs"), work = join(state, "batch-agent-sessions/work");
  mkdirSync(manifests, { recursive: true, mode: 0o700 });
  mkdirSync(work, { recursive: true, mode: 0o700 });
  // Checkouts and dependency trees can be large; keep them off a RAM-backed /tmp.
  const root = realpathSync(mkdtempSync(join(work, "run-")));
  const runId = randomUUID().replaceAll("-", "");
  const identity = statSync(root);
  const manifestPath = join(manifests, `${runId}.json`);
  const errors: string[] = [];
  const manifest: Manifest = { version: 1, run_id: runId, source: cwd, base_commit: context.base_commit,
    source_workspace: context.source_workspace_id, caller_pane: context.caller_pane, preflight: context,
    temporary_root: root, temporary_identity: { dev: identity.dev, ino: identity.ino }, temporary_state: "retained",
    evidence: [], errors, tasks: [], batches: plan.batches.map(batch => ({ ...batch, base_commit: context.base_commit,
      branch: `fix/batch-${batch.name}-${runId.slice(0, 12)}`, path: join(root, "worktrees", batch.name), state: "pending" })) };
  save(manifest, manifestPath);
  mkdirSync(join(root, "evidence"));
  prepareBatches(manifest, manifestPath, plan, manifest.batches, runner, rollout, errors);
  return { manifestPath, manifest, errors };
}

function prepareBatches(manifest: Manifest, manifestPath: string, plan: Plan, batches: Batch[], runner: Runner, rollout: string | undefined, errors: string[]): void {
  const root = manifest.temporary_root;
  const source = runner(["git", "rev-parse", "--show-toplevel"], manifest.source);
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
    mkdirSync(join(root, "worktrees"), { recursive: true });
    for (const batch of batches) {
      try {
        batch.state = "creating";
        save(manifest, manifestPath);
        console.error(`${batch.name}: creating shared-base worktree`);
        const created = response<{ workspace: { workspace_id: string }; root_pane: { pane_id: string }; worktree: { path: string } }>(runner,
          ["worktree", "create", "--workspace", manifest.source_workspace, "--branch", batch.branch, "--base", batch.base_commit ?? manifest.base_commit,
            "--path", batch.path, "--label", batch.name, "--no-focus"], manifest.source);
        batch.workspace = created.workspace.workspace_id;
        batch.pane = created.root_pane.pane_id;
        batch.state = "created";
        save(manifest, manifestPath);
        if (realpathSync(created.worktree.path) !== batch.path) throw new Error("creation returned a different checkout path");
        if (runner(["git", "rev-parse", "HEAD"], batch.path) !== (batch.base_commit ?? manifest.base_commit)) throw new Error("checkout HEAD differs from shared base");
        initSubmodules(runner, batch, batch.path, source);
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
}

function load(manifestPath: string): Manifest {
  if (process.env.HERDR_ENV !== "1") throw new Error("Not inside a Herdr-managed pane (HERDR_ENV must be 1).");
  const manifest: Manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  if (manifest.version !== 1) throw new Error("unsupported manifest version");
  if (manifest.temporary_state !== "removed") checkTemporaryIdentity(manifest);
  return manifest;
}

export function add(manifestPath: string, value: unknown, runner: Runner = run, rollout?: string): { manifest: Manifest; errors: string[] } {
  const plan = validatePlan(value), manifest = load(manifestPath);
  if (manifest.temporary_state === "removed") throw new Error("run already cleaned up; prepare a new run");
  for (const batch of plan.batches) if (manifest.batches.some(existing => existing.name === batch.name)) throw new Error(`${batch.name}: already in this run; use follow-up for its existing assignment`);
  for (const item of plan.evidence ?? []) if (manifest.evidence.some(existing => existing.name === item.name)) throw new Error(`${item.name}: evidence name already in this run`);
  const base = runner(["git", "rev-parse", "--verify", `${plan.base_commit ?? "HEAD"}^{commit}`], manifest.source);
  if (!/^[0-9a-f]{40,64}$/.test(base)) throw new Error("could not resolve additive batch base");
  const batches: Batch[] = plan.batches.map(batch => ({ ...batch, base_commit: base,
    branch: `fix/batch-${batch.name}-${manifest.run_id.slice(0, 12)}`, path: join(manifest.temporary_root, "worktrees", batch.name), state: "pending" }));
  manifest.batches.push(...batches);
  const errors: string[] = [];
  manifest.errors = errors;
  save(manifest, manifestPath);
  prepareBatches(manifest, manifestPath, plan, batches, runner, rollout, errors);
  return { manifest, errors };
}

function checkTemporaryIdentity(manifest: Manifest): void {
  const root = manifest.temporary_root;
  if (realpathSync(root) !== root) throw new Error("temporary root is no longer its recorded directory");
  const current = statSync(root);
  if (current.dev !== manifest.temporary_identity.dev || current.ino !== manifest.temporary_identity.ino) throw new Error("temporary root identity changed");
}

const pause = (milliseconds: number): void => { Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, milliseconds); };
const quote = (value: string): string => `'${value.replaceAll("'", "'\\''")}'`;
const escapeRegex = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

function selection(manifest: Manifest, names: string[]): Batch[] {
  const batches = names.length ? [...new Set(names)].map(name => {
    const batch = manifest.batches.find(batch => batch.name === name);
    if (!batch) throw new Error(`${name}: unknown batch`);
    return batch;
  }) : manifest.batches.filter(batch => batch.state !== "removed");
  return batches;
}

function live(manifest: Manifest, batch: Batch, runner: Runner): { agent: Agent; process: Process } {
  if (!batch.workspace || !batch.pane || batch.pane === manifest.caller_pane) throw new Error("missing owned pane receipt");
  const { workspace } = response<Workspace>(runner, ["workspace", "get", batch.workspace], manifest.source);
  if (!workspace.worktree?.is_linked_worktree || workspace.worktree.checkout_path !== batch.path) throw new Error("workspace no longer owns recorded checkout");
  const { agent } = response<{ agent: Agent }>(runner, ["agent", "get", batch.pane], manifest.source);
  if (agent.pane_id !== batch.pane || realpathSync(agent.foreground_cwd ?? agent.cwd ?? "") !== batch.path) throw new Error("agent is not in the recorded checkout");
  const { process_info } = response<{ process_info: ProcessInfo }>(runner, ["pane", "process-info", "--pane", batch.pane], manifest.source);
  const processes = process_info.foreground_processes ?? [];
  const kind = batch.agent?.kind;
  if (agent.agent !== (kind === "mekugi" ? "codex" : kind)) throw new Error("recorded pane hosts a different agent kind");
  const process = kind === "mekugi" ? processes.find(process => process.name === "mekugi") : processes.find(process => process.name === kind)
    ?? processes.find(process => process.pid !== process_info.shell_pid && process.cwd === batch.path);
  if (!process || (kind === "mekugi" && !processes.some(process => process.name === "codex"))) throw new Error("expected launcher and native agent processes are not running");
  if (realpathSync(process.cwd) !== batch.path || (batch.launch?.pid && process.pid !== batch.launch.pid)) throw new Error("launcher identity changed; inspect before delivery");
  if (batch.launch?.session && agent.agent_session?.value !== batch.launch.session) throw new Error("agent session changed; inspect before delivery");
  return { agent, process };
}

function promptText(task: string, handoff: string | undefined, manifest: Manifest): string {
  const resolved = handoff?.replace(/\{\{evidence:([A-Za-z0-9._-]+)\}\}/g, (_, name) => {
    const evidence = manifest.evidence.find(item => item.name === name);
    if (!evidence || !existsSync(evidence.path)) throw new Error(`${name}: handoff evidence is not present in this run`);
    return evidence.path;
  });
  const prefix = task.trimStart().startsWith("/") ? "Task:\n" : "";
  return prefix + task + (resolved ? `\n\nHandoff:\n${resolved}` : "");
}

function deliver(manifest: Manifest, manifestPath: string, batch: Batch, task: Task, runner: Runner): void {
  const text = promptText(task.task, task.handoff, manifest);
  if (batch.agent?.kind === "mekugi") {
    const read = () => runner(["herdr", "agent", "read", batch.pane!, "--source", "detection", "--lines", "80"], manifest.source);
    const emptyComposer = (screen: string) => /^(│?)╭─ (?:Ready\b|Completed\b|Interrupted\b)[^\n]*\n\1│ ❯ *│\1[^\n]*\n\1╰─/m.test(screen);
    const dialog = (screen: string) => /[╭╰][^\n]*(?:\[×\]|↑↓[^\n]*\besc\b|Esc close)/u.test(screen);
    const mainFocused = (screen: string) => /^│?╭─ (?:Ready\b|Completed\b|Interrupted\b)/m.test(screen)
      && !/\bj\/k\b|\bs files\b|\bctrl\+b 1-5 focus\b/.test(screen.trim().split("\n").at(-1) ?? "");
    let screen = read();
    // Never paste over a draft or into a dialog. Keep the receipt queued until
    // the existing pane is ready; no prompt effect has happened yet.
    if (dialog(screen)) throw new Error("Mekugi has an open dialog; task remains queued, inspect the pane before retrying");
    if (!mainFocused(screen)) {
      response(runner, ["agent", "send-keys", batch.pane!, "ctrl+b", "1"], manifest.source);
      const deadline = Date.now() + 2_000;
      do {
        screen = read();
        if (mainFocused(screen)) break;
        pause(100);
      } while (Date.now() < deadline);
      if (!mainFocused(screen)) throw new Error("Mekugi composer focus was not confirmed; task remains queued");
    }
    if (dialog(screen) || !emptyComposer(screen)) throw new Error("Mekugi needs an empty ready composer; task remains queued, inspect the pane before retrying");
  }
  task.state = "submitting";
  save(manifest, manifestPath);
  console.error(`${batch.name}: delivering task ${task.id}`);
  try {
    const { agent } = response<{ agent: Agent }>(runner, ["agent", "prompt", batch.pane!, text, "--wait", "--until", "working", "--timeout", "30000"], manifest.source);
    if (agent?.agent_status !== "working") throw new Error("prompt did not establish working activity");
    task.state = "working";
    delete task.error;
  } catch (error) {
    task.error = `delivery uncertain: ${message(error)}; inspect the pane; do not resubmit this task blindly`;
    throw new Error(task.error);
  } finally { save(manifest, manifestPath); }
}

export function launch(manifestPath: string, selected: string[] = [], runner: Runner = run, value?: unknown): { manifest: Manifest; errors: string[] } {
  const manifest = load(manifestPath), errors: string[] = [];
  if (value !== undefined) {
    const plan = validatePlan(value);
    for (const item of plan.batches) {
      const batch = manifest.batches.find(batch => batch.name === item.name);
      if (!batch || batch.state !== "prepared" || batch.launch || !item.task || !item.agent) throw new Error(`${item.name}: launch plan requires an unlaunched prepared batch, task and agent`);
    }
    for (const item of plan.batches) Object.assign(manifest.batches.find(batch => batch.name === item.name)!, { task: item.task, handoff: item.handoff, agent: item.agent });
    save(manifest, manifestPath);
  }
  for (const batch of selection(manifest, selected)) {
    try {
      if (batch.state !== "prepared" || !batch.pane) throw new Error("batch is not prepared");
      if (!batch.task || !batch.agent) throw new Error("launch requires the batch task and agent route in its preparation plan");
      const initialId = `initial:${batch.name}`;
      const prior = manifest.tasks?.find(task => task.id === initialId);
      if (prior?.state === "working") { live(manifest, batch, runner); continue; }
      if (prior?.state === "submitting") throw new Error("initial delivery uncertain; inspect existing session, do not resend");
      const route = batch.agent;
      const args = [...(route.args ?? [])];
      if (route.model) args.push("-m", route.model);
      if (route.effort) args.push("-c", `model_reasoning_effort=${JSON.stringify(route.effort)}`);
      if (route.profile) args.push("-p", route.profile);
      if (!batch.launch) {
        // Only use the owned empty shell, never an editor or an already-running agent.
        const { process_info } = response<{ process_info: ProcessInfo }>(runner, ["pane", "process-info", "--pane", batch.pane], manifest.source);
        if (!process_info.shell_pid || process_info.foreground_process_group_id !== process_info.shell_pid) throw new Error("prepared pane is not an idle shell");
        const { agents } = response<{ agents: Agent[] }>(runner, ["agent", "list"], manifest.source);
        if (agents.some(agent => agent.pane_id === batch.pane)) throw new Error("prepared pane already hosts an agent; inspect it");
        let name = route.kind, suffix = 2;
        while (agents.some(agent => agent.name === name)) name = `${route.kind}-${suffix++}`;
        let command: string[] | undefined;
        if (route.kind === "mekugi") {
          const executable = manifest.preflight.mekugi_executable;
          if (!executable || !isAbsolute(executable) || !existsSync(executable)) throw new Error("preflight did not establish a reusable absolute Mekugi executable");
          if (!manifest.preflight.caller_uses_mekugi && !route.allow_yolo) throw new Error("Mekugi requires authorized --yolo; supply allow_yolo only after user authorization");
          command = [executable, ...(manifest.preflight.mekugi_flags ?? []), "codex", "--yolo", ...args];
          const environment = ["TMPDIR", "MEKUGI_RUNTIME_DIR"].flatMap(key => {
            const directory = process.env[key];
            if (!directory) return [];
            if (!isAbsolute(directory)) throw new Error(`${key} must be absolute`);
            return [`${key}=${directory}`];
          });
          if (environment.length) command = ["env", ...environment, ...command];
        }
        response(runner, ["pane", "rename", batch.pane, batch.name], manifest.source);
        batch.launch = { name, state: "starting" };
        save(manifest, manifestPath);
        console.error(`${batch.name}: launching ${name}`);
        if (command) runner(["herdr", "pane", "run", batch.pane, command.map(quote).join(" ")], manifest.source);
        else response(runner, ["agent", "start", name, "--kind", route.kind, "--pane", batch.pane, "--", ...args], manifest.source);
        batch.launch.state = "started";
        save(manifest, manifestPath);
      }
      // Poll readiness inside this deterministic command, not via coordinator shell loops.
      let info: ReturnType<typeof live> | undefined, last = "agent not detected";
      const deadline = Date.now() + 30_000;
      do {
        try { info = live(manifest, batch, runner); break; } catch (error) { last = message(error); }
        pause(100);
      } while (Date.now() < deadline);
      if (!info) throw new Error(`launch unresolved: ${last}; inspect the retained pane instead of launching again`);
      batch.launch!.pid = info.process.pid;
      batch.launch!.session = info.agent.agent_session?.value;
      save(manifest, manifestPath);
      const { agents } = response<{ agents: Agent[] }>(runner, ["agent", "list"], manifest.source);
      let name = batch.launch!.name, suffix = 2;
      while (agents.some(agent => agent.pane_id !== batch.pane && agent.name === name)) name = `${route.kind}-${suffix++}`;
      batch.launch!.name = name;
      save(manifest, manifestPath);
      response(runner, ["agent", "rename", batch.pane, batch.launch!.name], manifest.source);
      if (!["idle", "done", "unknown"].includes(info.agent.agent_status)) throw new Error("agent is not ready for its initial task");
      if (["mekugi", "codex"].includes(route.kind)) {
        const pattern = route.model ? escapeRegex(route.model) : "[a-zA-Z0-9_.:-]+";
        let budget: RegExpExecArray | null;
        do {
          const text = runner(["herdr", "agent", "read", batch.pane, "--source", "detection", "--lines", "80"], manifest.source);
          budget = new RegExp(`(${pattern})\\s*\\((low|medium|high|xhigh|max)\\)`).exec(text);
          if (budget || /\b[a-zA-Z0-9_.:-]+\s*\((low|medium|high|xhigh|max)\)/.test(text) || Date.now() >= deadline) break;
          pause(100);
        } while (true);
        if ((route.model || route.effort) && (!budget || (route.effort && budget[2] !== route.effort))) throw new Error("loaded model/effort could not be verified from the client UI; inspect it before task delivery");
        if (budget) { batch.launch!.model = budget[1]; batch.launch!.effort = budget[2]; }
      }
      batch.launch!.state = "verified";
      const task: Task = prior ?? { id: initialId, batch: batch.name, task: batch.task, handoff: batch.handoff, state: "queued" };
      if (!prior) (manifest.tasks ??= []).push(task);
      save(manifest, manifestPath);
      deliver(manifest, manifestPath, batch, task, runner);
      delete batch.error;
    } catch (error) { batch.error = message(error); errors.push(`${batch.name}: ${batch.error}`); }
    save(manifest, manifestPath);
  }
  manifest.errors = errors;
  save(manifest, manifestPath);
  return { manifest, errors };
}

export function retryStartup(manifestPath: string, names: string[], runner: Runner = run): { manifest: Manifest; errors: string[] } {
  if (!names.length) throw new Error("retry-startup requires --batch NAME");
  const manifest = load(manifestPath), batches = selection(manifest, names);
  for (const batch of batches) {
    if (batch.state !== "prepared" || !batch.workspace || !batch.pane || batch.pane === manifest.caller_pane
      || !batch.launch || batch.launch.state === "verified" || batch.launch.pid || batch.launch.session
      || manifest.tasks?.some(task => task.batch === batch.name)) throw new Error(`${batch.name}: startup retry requires an undelivered, unverified launch`);
    const { workspace } = response<Workspace>(runner, ["workspace", "get", batch.workspace], manifest.source);
    if (!workspace.worktree?.is_linked_worktree || workspace.worktree.checkout_path !== batch.path) throw new Error(`${batch.name}: workspace no longer owns recorded checkout`);
    const { pane } = response<{ pane: { workspace_id: string } }>(runner, ["pane", "get", batch.pane], manifest.source);
    if (pane.workspace_id !== batch.workspace) throw new Error(`${batch.name}: pane no longer belongs to the recorded workspace`);
    const { process_info } = response<{ process_info: ProcessInfo }>(runner, ["pane", "process-info", "--pane", batch.pane], manifest.source);
    const { agents } = response<{ agents: Agent[] }>(runner, ["agent", "list"], manifest.source);
    if (!process_info.shell_pid || process_info.foreground_process_group_id !== process_info.shell_pid
      || agents.some(agent => agent.pane_id === batch.pane)) throw new Error(`${batch.name}: startup retry requires an idle shell with no agent`);
  }
  for (const batch of batches) delete batch.launch;
  save(manifest, manifestPath);
  return launch(manifestPath, names, runner);
}

export function followUp(manifestPath: string, value: unknown = undefined, runner: Runner = run, readyUnknown: string[] = []): { manifest: Manifest; errors: string[] } {
  const manifest = load(manifestPath), errors: string[] = [];
  if (manifest.temporary_state === "removed") throw new Error("run already cleaned up; prepare a new run");
  const incoming = value === undefined ? [] : (value as { tasks: Task[] })?.tasks;
  if (!Array.isArray(incoming) || (value !== undefined && !incoming.length)) throw new Error("follow-up plan requires a nonempty tasks list");
  const tasks = manifest.tasks ??= [];
  const additions: Task[] = [];
  for (const item of incoming) {
    if (!item || typeof item.id !== "string" || !/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,79}$/.test(item.id) || typeof item.task !== "string" || !item.task.trim() || (item.handoff !== undefined && typeof item.handoff !== "string")) throw new Error("invalid follow-up ID, task or handoff");
    const batch = manifest.batches.find(batch => batch.name === item.batch);
    if (batch?.launch?.state !== "verified" || batch.state !== "prepared" || !tasks.some(task => task.id === `initial:${batch.name}` && task.state === "working")) throw new Error(`${item.batch}: follow-up needs a verified batch with its initial task delivered`);
    const prior = [...tasks, ...additions].find(task => task.id === item.id);
    if (prior) {
      if (prior.batch !== item.batch || prior.task !== item.task || prior.handoff !== item.handoff) throw new Error(`${item.id}: task ID already records different content`);
    } else additions.push({ id: item.id, batch: item.batch, task: item.task, handoff: item.handoff, state: "queued" });
  }
  tasks.push(...additions);
  save(manifest, manifestPath);
  for (const batch of manifest.batches) {
    const queued = tasks.find(task => task.batch === batch.name && task.state === "queued");
    if (!queued) continue;
    try {
      if (tasks.some(task => task.batch === batch.name && task.state === "submitting")) throw new Error("earlier delivery uncertain; inspect it before sending further tasks");
      const { agent } = live(manifest, batch, runner);
      if (!["idle", "done"].includes(agent.agent_status) && !(agent.agent_status === "unknown" && readyUnknown.includes(batch.name))) {
        console.error(`${batch.name}: follow-up ${queued.id} queued (${agent.agent_status})`);
        continue;
      }
      deliver(manifest, manifestPath, batch, queued, runner);
    } catch (error) { errors.push(`${batch.name}: ${message(error)}`); }
  }
  manifest.errors = errors;
  save(manifest, manifestPath);
  return { manifest, errors };
}

export function cancel(manifestPath: string, id: string): { manifest: Manifest; errors: string[] } {
  const manifest = load(manifestPath);
  const task = manifest.tasks?.find(task => task.id === id);
  if (!task || id.startsWith("initial:") || !["queued", "cancelled"].includes(task.state)) {
    throw new Error("cancellation requires an undelivered queued follow-up ID");
  }
  if (task.state !== "cancelled") {
    task.state = "cancelled";
    save(manifest, manifestPath);
  }
  return { manifest, errors: [] };
}

export function acknowledge(manifestPath: string, id: string, runner: Runner = run): { manifest: Manifest; errors: string[] } {
  const manifest = load(manifestPath);
  const task = manifest.tasks?.find(task => task.id === id);
  if (!task || task.state !== "submitting") throw new Error("acknowledgement requires a retained uncertain delivery ID");
  const batch = manifest.batches.find(batch => batch.name === task.batch)!;
  live(manifest, batch, runner);
  // The caller has inspected the pane and attests that this exact task arrived.
  task.state = "working";
  delete task.error;
  save(manifest, manifestPath);
  return { manifest, errors: [] };
}

export function runAsync(argv: string[], cwd: string, signal: AbortSignal): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn(argv[0], argv.slice(1), { cwd, signal, stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "", stderr = "";
    child.stdout.on("data", data => { stdout += data; });
    child.stderr.on("data", data => { stderr += data; });
    child.on("error", reject);
    child.on("close", code => code === 0 ? resolve(stdout.trimEnd()) : reject(new Error(stderr.trim().slice(0, 1500) || `wait exited ${code}`)));
  });
}

export async function wait(manifestPath: string, selected: string[] = [], runner: AsyncRunner = runAsync, timeoutMs = 120_000): Promise<{ manifest: Manifest; errors: string[]; event?: { batch: string; status: string } }> {
  const manifest = load(manifestPath);
  if (!Number.isSafeInteger(timeoutMs) || timeoutMs < 1) throw new Error("timeout must be a positive millisecond integer");
  const batches = selection(manifest, selected).filter(batch => batch.launch && batch.state === "prepared");
  if (!batches.length) throw new Error("no launched batches selected for wait");
  const controller = new AbortController();
  console.error(`waiting on ${batches.map(batch => batch.name).join(", ")}`);
  const jobs = batches.map(async batch => {
    const raw = await runner(["herdr", "agent", "wait", batch.pane!, "--until", "idle", "--until", "done", "--until", "blocked", "--until", "unknown", "--timeout", String(timeoutMs)], manifest.source, controller.signal);
    const value = JSON.parse(raw);
    if (value.error || !value.result) throw new Error(`${batch.name}: ${value.error?.message ?? "Herdr returned no wait result"}`);
    const agent = value.result.agent;
    if (!agent?.agent_status) throw new Error(`${batch.name}: wait did not return agent status`);
    if (agent.pane_id !== batch.pane || (batch.launch?.session && agent.agent_session?.value !== batch.launch.session)) throw new Error(`${batch.name}: wait target session changed`);
    return { batch: batch.name, status: agent.agent_status };
  });
  let event: { batch: string; status: string } | undefined;
  const errors: string[] = [];
  try { event = await Promise.race(jobs); }
  catch (error) { errors.push(message(error)); }
  finally { controller.abort(); await Promise.allSettled(jobs); }
  // Do not rewrite a stale manifest while a separate add/follow-up command may have run.
  return { manifest: load(manifestPath), errors, ...(event ? { event } : {}) };
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
  const manifest = load(manifestPath);
  const batches = new Map(manifest.batches.map(batch => [batch.name, batch]));
  const errors: string[] = [];
  const confirmedReady = new Set(readyUnknown);
  for (const name of confirmedReady) if (!completed.includes(name)) errors.push(`${name}: ready-unknown requires a completed selection`);
  for (const name of new Set(completed)) {
    const batch = batches.get(name);
    if (!batch) { errors.push(`${name}: unknown batch`); continue; }
    if (batch.state === "removed") continue;
    try {
      if (manifest.tasks?.some(task => task.batch === name && task.state !== "working" && task.state !== "cancelled")) throw new Error("queued or uncertain tasks remain; inspect and finish them before cleanup");
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
      if (runner(["git", "status", "--porcelain", "--ignore-submodules=none"], expected)) throw new Error("worktree has uncommitted files; preserve it");
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
      const retained = retainSubmodules(runner, batch, expected, runner(["git", "rev-parse", "--show-toplevel"], manifest.source), batch.base_commit ?? manifest.base_commit);
      if (retained.length) batch.retained_submodules = retained;
      // Git refuses to remove any checkout with submodule repositories unless forced; the checks above
      // established that it is clean and that changed nested commits are retained.
      const force = existsSync(runner(["git", "rev-parse", "--path-format=absolute", "--git-path", "modules"], expected))
        || gitlinks(runner, expected, "HEAD").some(link => populated(join(expected, link.path)));
      console.error(`${name}: removing completed worktree${force ? " with its submodules" : ""}; retaining branch ${batch.branch}`);
      batch.retained_tip = tip;
      if (readyUnknown) batch.ready_unknown = true;
      batch.state = "removing";
      save(manifest, manifestPath);
      const removed = response<{ path: string; forced: boolean }>(runner, ["worktree", "remove", "--workspace", batch.workspace, ...(force ? ["--force"] : [])], manifest.source);
      if (removed.path !== expected || (!force && removed.forced !== false)) throw new Error("unexpected removal receipt; inspect actual outcome");
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

async function main(): Promise<number> {
  const { values, positionals } = parseArgs({ allowPositionals: true, options: {
    cwd: { type: "string" }, plan: { type: "string" }, rollout: { type: "string" }, manifest: { type: "string" },
    batch: { type: "string", multiple: true }, timeout: { type: "string" }, task: { type: "string" },
    completed: { type: "string", multiple: true }, "ready-unknown": { type: "string", multiple: true }, version: { type: "boolean" }, help: { type: "boolean" },
  } });
  if (values.version) { console.log(VERSION); return 0; }
  if (values.help) {
    console.log("batch-agent-sessions prepare --cwd DIR --plan FILE|- [--rollout PATH]\nbatch-agent-sessions add --manifest PATH --plan FILE|- [--rollout PATH]\nbatch-agent-sessions launch --manifest PATH [--batch NAME ...] [--plan FILE|-]\nbatch-agent-sessions retry-startup --manifest PATH --batch NAME [--batch NAME ...]\nbatch-agent-sessions wait --manifest PATH [--batch NAME ...] [--timeout MS]\nbatch-agent-sessions follow-up --manifest PATH [--plan FILE|-] [--ready-unknown NAME ...]\nbatch-agent-sessions cancel --manifest PATH --task ID\nbatch-agent-sessions acknowledge --manifest PATH --task ID\nbatch-agent-sessions cleanup --manifest PATH --completed NAME [--completed NAME ...] [--ready-unknown NAME ...]");
    return 0;
  }
  if (positionals.length !== 1) throw new Error("use --help for lifecycle arguments");
  const command = positionals[0];
  const plan = () => JSON.parse(readFileSync(values.plan === "-" ? 0 : values.plan!, "utf8"));
  const manifestPath = values.manifest ? realpathSync(values.manifest) : undefined;
  let lock: number | undefined;
  try {
    if (manifestPath && command !== "wait") {
      // An inherited open-file-description lock survives flock's child exit and is
      // released by closing this fd, including when the helper is interrupted.
      lock = openSync(`${manifestPath}.lock`, "a", 0o600);
      const locked = spawnSync("flock", ["--nonblock", "3"], { stdio: ["ignore", "pipe", "pipe", lock] });
      if (locked.error || locked.status !== 0) throw new Error(locked.error?.message ?? "another lifecycle command owns this manifest; retry after it finishes");
    }
    let result: { manifest: Manifest; errors: string[]; manifestPath?: string; event?: { batch: string; status: string } };
    if (command === "prepare" && values.cwd && values.plan) result = prepare(plan(), realpathSync(values.cwd), run, discover, values.rollout);
    else if (manifestPath && command === "add" && values.plan) result = add(manifestPath, plan(), run, values.rollout);
    else if (manifestPath && command === "launch") result = launch(manifestPath, values.batch, run, values.plan ? plan() : undefined);
    else if (manifestPath && command === "retry-startup") result = retryStartup(manifestPath, values.batch ?? [], run);
    else if (manifestPath && command === "follow-up") result = followUp(manifestPath, values.plan ? plan() : undefined, run, values["ready-unknown"]);
    else if (manifestPath && command === "cancel" && values.task) result = cancel(manifestPath, values.task);
    else if (manifestPath && command === "acknowledge" && values.task) result = acknowledge(manifestPath, values.task, run);
    else if (manifestPath && command === "wait") result = await wait(manifestPath, values.batch, runAsync, values.timeout === undefined ? 120_000 : Number(values.timeout));
    else if (manifestPath && command === "cleanup" && values.completed?.length) result = cleanup(manifestPath, values.completed, run, values["ready-unknown"]);
    else throw new Error("use --help for lifecycle arguments");
    const { manifest, errors, event } = result;
    console.log(JSON.stringify({ manifest: result.manifestPath ?? manifestPath, base_commit: manifest.base_commit, temporary_root: manifest.temporary_root,
      temporary_state: manifest.temporary_state, evidence: manifest.evidence, batches: manifest.batches, tasks: manifest.tasks ?? [], ...(event ? { event } : {}) }));
    for (const error of errors) console.error(error);
    return Number(errors.length > 0);
  } finally { if (lock !== undefined) closeSync(lock); }
}

if (import.meta.main) {
  try { process.exitCode = await main(); } catch (error) { console.error(message(error)); process.exitCode = 1; }
}

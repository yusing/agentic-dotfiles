import { spawn, type ChildProcess } from "node:child_process";
import { access, lstat, mkdir, open, readFile, realpath, unlink, writeFile } from "node:fs/promises";
import { dlopen, read } from "bun:ffi";
import { homedir, hostname } from "node:os";
import { dirname, join, resolve } from "node:path";
import { createInterface } from "node:readline";
import type { Readable } from "node:stream";
import { openaiDocsUpdatePrompt, repairPrompt } from "./repair-prompt";

export const VERSION = "1.6.0";
const roots = [".agents/skills", ".claude/skills"];
const claudeProfile = "gemini-web";
const disappeared = /does not contain skill|0 matching skills|remote skill name .+ does not match SKILL\.md name|remote skill .+ (?:is missing|has invalid) SKILL\.md|repository not found|repository .+ not found|\b(?:404|410)\b/i;
const stalePatch = /remote skill patch no longer applies/i;
let active: ChildProcess | undefined;
let stopped = false;

type AgentBackend =
	| { kind: "codex"; label: string }
	| { kind: "claude"; label: string; settingsPath: string }
	| { kind: "devin"; label: string };

function normalizeHost(name: string): string {
	return name.trim().replace(/\.+$/, "").toLowerCase();
}

function matchesLeader(current: string, leader: string): boolean {
	const actual = normalizeHost(current);
	const expected = normalizeHost(leader);
	if (!actual || !expected) return false;
	if (actual === expected) return true;
	return !expected.includes(".") && actual.split(".")[0] === expected;
}

function schedulerEnvironment(): NodeJS.ProcessEnv {
	const env: NodeJS.ProcessEnv = { ...process.env, SKILLS_MGR_NO_REFRESH: "1", GIT_TERMINAL_PROMPT: "0" };
	for (const key of Object.keys(env)) {
		if (key.startsWith("MEKUGI_") || /^(CODEX_THREAD_ID|CODEX_SESSION_ID|CODEX_TOOL_CALL_ID|CODEX_ROLLOUT_TRACE_ROOT|CLAUDECODE|CLAUDE_CODE_ENTRYPOINT|DEVIN_SESSION_ID|DEVIN_TRACEPARENT|DEVIN_PROJECT_DIR)$/.test(key)) delete env[key];
	}
	if (process.env.MEKUGI_EXEC_TRACK) {
		delete env.BASH_ENV;
		if (process.env.MEKUGI_USER_BASH_ENV) env.BASH_ENV = process.env.MEKUGI_USER_BASH_ENV;
	}
	env.PATH = [
		...(env.PATH ?? "").split(":").filter(p => !p.includes("/mekugi-tools-")),
		join(homedir(), ".local/bin"), join(homedir(), "go/bin"), join(homedir(), ".local/share/mise/shims"),
	].join(":");
	return env;
}

function claudeEnvironment(env: NodeJS.ProcessEnv): NodeJS.ProcessEnv {
	const next: NodeJS.ProcessEnv = { ...env };
	for (const key of Object.keys(next)) {
		if (key.startsWith("ANTHROPIC_")) delete next[key];
	}
	return next;
}

async function run(cwd: string, env: NodeJS.ProcessEnv, args: string[], options?: { stdin?: string; mekugiHeadless?: boolean }) {
	if (stopped) throw new Error("maintenance interrupted");
	const child = spawn(args[0], args.slice(1), { cwd, env, stdio: ["pipe", "pipe", "pipe"] });
	active = child;
	const done = new Promise<number>((resolve, reject) => {
		child.once("error", reject);
		child.once("close", code => resolve(code ?? 1));
	});
	let completed = false;
	const answers = new Map<string, string>();
	const collect = async (stream: Readable, headless = false) => {
		let output = "";
		if (headless) {
			for await (const line of createInterface({ input: stream })) {
				try {
					const event = JSON.parse(line);
					const item = event.params?.item;
					if (event.method === "item/completed" && item?.type === "agentMessage" && item.phase !== "commentary") {
						answers.set(event.params.threadId, item.text.slice(-128 * 1024));
					}
					if (event.method === "mekugi/headless/completed") {
						completed = true;
						const answer = answers.get(event.params?.threadId);
						if (answer) console.log(answer);
					}
				} catch { /* Other host output. */ }
			}
		} else for await (const chunk of stream.setEncoding("utf8")) output = (output + chunk).slice(-128 * 1024);
		return output;
	};
	child.stdin!.on("error", () => {}); // A rejected launch can close stdin before reading the prompt.
	child.stdin!.end(options?.stdin);
	const [status, stdout, stderr] = await Promise.all([done, collect(child.stdout!, options?.mekugiHeadless), collect(child.stderr!)]);
	active = undefined;
	return { status, stdout, stderr, completed };
}

async function readOptional(path: string): Promise<string> {
	try { return await readFile(path, "utf8"); } catch (error) {
		if ((error as NodeJS.ErrnoException).code === "ENOENT") return "";
		throw error;
	}
}

async function hasClaudeProfile(path: string): Promise<boolean> {
	const raw = await readOptional(path);
	if (!raw) return false;
	try {
		const parsed = JSON.parse(raw);
		return typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)
			&& typeof parsed.env === "object" && parsed.env !== null && !Array.isArray(parsed.env);
	} catch { return false; }
}

async function availableAgents(env: NodeJS.ProcessEnv): Promise<AgentBackend[]> {
	const backends: AgentBackend[] = [];
	if (Bun.which("mekugi", { PATH: env.PATH })) backends.push({ kind: "codex", label: "codex (gpt-6.1-terra)" });
	const settingsPath = join(homedir(), ".claude", `${claudeProfile}.settings.json`);
	if (Bun.which("claude", { PATH: env.PATH }) && await hasClaudeProfile(settingsPath)) {
		backends.push({ kind: "claude", label: `claude (${claudeProfile})`, settingsPath });
	}
	if (Bun.which("devin", { PATH: env.PATH })) backends.push({ kind: "devin", label: "devin" });
	return backends;
}

function parseClaudeResult(stdout: string): { completed: boolean; answer?: string; error?: string } {
	const trimmed = stdout.trim();
	const candidates = trimmed ? [trimmed, ...trimmed.split("\n").reverse().map(line => line.trim()).filter(Boolean)] : [];
	for (const candidate of candidates) {
		try {
			const parsed = JSON.parse(candidate);
			if (parsed && typeof parsed === "object" && parsed.type === "result") {
				const result = typeof parsed.result === "string" ? parsed.result.trim() : "";
				const ok = parsed.is_error === false && (!parsed.subtype || parsed.subtype === "success");
				return ok ? { completed: true, answer: result } : { completed: false, error: result || String(parsed.subtype ?? "claude error") };
			}
		} catch { /* Try next line. */ }
	}
	return { completed: false, error: "missing claude JSON result" };
}

async function runAgent(cwd: string, env: NodeJS.ProcessEnv, backend: AgentBackend, prompt: string) {
	if (backend.kind === "codex") {
		return run(cwd, env, ["mekugi", "codex", "headless", "--yolo", "-m", "gpt-6.1-terra"], { stdin: prompt, mekugiHeadless: true });
	}
	if (backend.kind === "claude") {
		const result = await run(
			cwd, claudeEnvironment(env),
			["claude", "-p", "--dangerously-skip-permissions", "--no-session-persistence", "--output-format", "json", "--settings", backend.settingsPath],
			{ stdin: prompt },
		);
		if (result.status) return { ...result, completed: false };
		const parsed = parseClaudeResult(result.stdout);
		if (parsed.completed) {
			if (parsed.answer) console.log(parsed.answer);
			return { ...result, completed: true };
		}
		return { ...result, completed: false, stderr: [result.stderr.trim(), parsed.error].filter(Boolean).join("\n") };
	}
	const result = await run(cwd, env, ["devin", "-p", "--permission-mode", "dangerous", "--respect-workspace-trust=false", "--", prompt]);
	const completed = result.status === 0;
	if (completed && result.stdout.trim()) console.log(result.stdout.trim());
	return { ...result, completed };
}

async function repoSnapshot(cwd: string, env: NodeJS.ProcessEnv): Promise<string> {
	const head = await run(cwd, env, ["git", "rev-parse", "HEAD"]);
	const status = await run(cwd, env, ["git", "status", "--porcelain=v1", "--untracked-files=all"]);
	if (head.status || status.status) throw new Error(head.stderr || status.stderr || "failed to inspect repository state");
	return `${head.stdout.trim()}\n${status.stdout}`;
}

async function dispatchAgent(cwd: string, env: NodeJS.ProcessEnv, taskLabel: string, prompt: string) {
	const backends = await availableAgents(env);
	if (!backends.length) {
		return {
			status: 1, stdout: "", completed: false,
			stderr: `No maintenance agent backend available (checked codex/mekugi, claude with ${claudeProfile} profile, devin).`,
		};
	}
	const before = await repoSnapshot(cwd, env);
	let last = { status: 1, stdout: "", stderr: "", completed: false };
	for (let i = 0; i < backends.length; i++) {
		if (stopped) throw new Error("maintenance interrupted");
		const backend = backends[i];
		console.log(`Starting ${backend.label} ${taskLabel}.`);
		last = await runAgent(cwd, env, backend, prompt);
		if (!last.status && last.completed) return last;
		if (stopped) throw new Error("maintenance interrupted");
		if (i + 1 < backends.length) {
			if (await repoSnapshot(cwd, env) !== before) {
				console.error(`${backend.label} failed after modifying repository state; skipping fallback to ${backends[i + 1].label}.`);
				return last;
			}
			console.error(`${backend.label} failed (exit ${last.status}, completed=${last.completed}); falling back to ${backends[i + 1].label}.`);
		}
	}
	return last;
}

async function lock(path: string): Promise<(() => Promise<void>) | undefined> {
	await mkdir(dirname(path), { recursive: true, mode: 0o700 });
	const native = process.platform === "darwin"
		? dlopen("/usr/lib/libSystem.B.dylib", { flock: { args: ["i32", "i32"], returns: "i32" }, __error: { args: [], returns: "ptr" } })
		: dlopen("libc.so.6", { flock: { args: ["i32", "i32"], returns: "i32" }, __errno_location: { args: [], returns: "ptr" } });
	const file = await open(path, "a", 0o600);
	const release = async () => { await file.close(); native.close(); };
	try {
		while (native.symbols.flock(file.fd, 2 | 4) !== 0) {
			const errno = read.i32("__error" in native.symbols ? native.symbols.__error() : native.symbols.__errno_location());
			if (errno === 4) continue; // EINTR on both platforms.
			if (errno !== (process.platform === "darwin" ? 35 : 11)) throw new Error(`maintenance flock failed: errno ${errno}`);
			await release();
			return undefined;
		}
		return release; // Closing the descriptor releases the OS lock, including after a crash.
	} catch (error) { await release(); throw error; }
}

// Go slog's text handler quotes string values when they contain whitespace.
function field(line: string, name: string): string {
	const value = line.match(new RegExp(`(?:^| )${name}=("(?:[^"\\\\]|\\\\.)*"|[^ ]+)`))?.[1];
	return value?.startsWith('"') ? JSON.parse(value) : value ?? "";
}

async function placeholderChanges(cwd: string, env: NodeJS.ProcessEnv) {
	const status = await run(cwd, env, ["git", "status", "--porcelain=v1", "-z", "--untracked-files=all", "--no-renames", "--", ...roots]);
	if (status.status) throw new Error(status.stderr);
	return status.stdout.split("\0").filter(Boolean).map(row => ({ status: row.slice(0, 2), path: row.slice(3) }))
		.filter(row => /^\.[^/]+\/skills\/[^/]+\/(SKILL\.md|\.skills-mgr-placeholder)$/.test(row.path));
}

async function commitBaseInstructions(cwd: string, env: NodeJS.ProcessEnv): Promise<void> {
	const owner = ".codex/base-instructions";
	const git = async (...args: string[]) => {
		const result = await run(cwd, env, ["git", ...args]);
		if (result.status) throw new Error(result.stderr || result.stdout);
		return result.stdout;
	};
	const tracked = new Set((await git("ls-files", "-z", "--", owner)).split("\0").filter(Boolean));
	if (!tracked.size) return; // The public projection does not track the snapshots.
	const mekugi = Bun.which("mekugi", { PATH: env.PATH });
	if (!mekugi) return;
	const catalog = join(dirname(await realpath(mekugi)), "mekugi-models.json");
	let models: unknown;
	const body = await readFile(catalog, "utf8");
	try { models = JSON.parse(body)?.models; } catch {
		throw new Error("Mekugi model catalog is not valid JSON.");
	}
	const validSlug = /^[a-z0-9][a-z0-9._-]*$/i;
	if (!Array.isArray(models) || !models.length) throw new Error("Mekugi model catalog contains no models.");
	const desired = new Map<string, string>();
	for (const model of models) {
		const slug = model?.slug;
		const body = model?.model_messages?.instructions_template;
		if (typeof slug !== "string" || !validSlug.test(slug) || typeof body !== "string" || !body.length) {
			throw new Error("Mekugi model catalog contains an invalid slug or missing instruction template.");
		}
		const path = `${owner}/${slug}.md`;
		if (desired.has(path)) throw new Error("Mekugi model catalog contains duplicate slugs.");
		desired.set(path, body);
	}
	const status = await git("status", "--porcelain=v1", "--untracked-files=all", "--ignored=matching", "--", owner);
	if (status) throw new Error("Base instruction snapshots have local changes; preserving them.");
	if (!(await lstat(join(cwd, owner))).isDirectory()) {
		throw new Error("Base instruction snapshot path is not a directory.");
	}
	// Check every existing entry before replacing or removing any of them.
	const updated = new Map<string, string>();
	for (const path of tracked) {
		const name = path.slice(owner.length + 1);
		const absolute = join(cwd, path);
		if (!name.endsWith(".md") || !validSlug.test(name.slice(0, -3)) || !(await lstat(absolute)).isFile()) {
			throw new Error("Base instruction snapshots contain an unexpected tracked path.");
		}
		const body = desired.get(path);
		if (body !== undefined && body !== await readFile(absolute, "utf8")) updated.set(path, body);
	}
	const added = [...desired.keys()].filter(path => !tracked.has(path));
	const removed = [...tracked].filter(path => !desired.has(path));
	const paths = [...updated.keys(), ...added, ...removed];
	if (!paths.length) return;
	for (const path of added) await writeFile(join(cwd, path), desired.get(path)!, { flag: "wx" });
	for (const [path, body] of updated) await writeFile(join(cwd, path), body);
	for (const path of removed) await unlink(join(cwd, path));
	if (added.length) await git("add", "--intent-to-add", "--", ...added);
	await git("commit", "--only", "-m", "chore(codex): refresh base instruction snapshots", "--", ...paths);
	console.log(`Committed ${paths.length} base instruction snapshot change(s).`);
}

async function commitPlaceholders(cwd: string, env: NodeJS.ProcessEnv, names: Set<string>, protectedDirectories: Set<string>): Promise<void> {
	const git = (...args: string[]) => run(cwd, env, ["git", ...args]);
	const rows = await placeholderChanges(cwd, env);
	const selected: typeof rows = [];
	for (const row of rows) {
		const directory = dirname(row.path);
		if (!names.has(directory.split("/").at(-1)!) || protectedDirectories.has(directory)) continue;
		// Preserve deliberately staged placeholder edits, including the paired marker.
		if (rows.some(other => dirname(other.path) === directory && ![" ", "?"].includes(other.status[0]))) continue;
		const marker = `${directory}/.skills-mgr-placeholder`;
		const current = await readOptional(join(cwd, marker));
		const previous = await git("show", `HEAD:${marker}`);
		if (current ? current !== "skills-mgr remote placeholder\n" : previous.stdout !== "skills-mgr remote placeholder\n") continue;
		if (row.path.endsWith("/SKILL.md")) {
			const body = await readOptional(join(cwd, row.path));
			const parts = body.split(/^---\r?$/m);
			if (body && (parts.length !== 3 || parts[0] || parts[2].trim())) continue;
		}
		selected.push(row);
	}
	if (!selected.length) return;
	const added = selected.filter(row => row.status === "??").map(row => row.path);
	if (added.length) {
		const result = await git("add", "--intent-to-add", "--", ...added);
		if (result.status) throw new Error(result.stderr);
	}
	const result = await git("commit", "--only", "-m", "chore(skills): refresh remote placeholders", "--", ...selected.map(row => row.path));
	if (result.status) throw new Error(result.stderr || result.stdout);
	console.log(`Committed ${selected.length} remote placeholder file(s).`);
}

async function updateOpenaiDocs(cwd: string, env: NodeJS.ProcessEnv): Promise<boolean> {
	const owner = ".skills-mgr/skills/openai-docs";
	const marker = `${owner}/.upstream-tree`;
	if (!await Bun.file(join(cwd, owner, "SKILL.md")).exists()) return false;
	const previous = (await readOptional(join(cwd, marker))).trim();
	if (!/^[a-f0-9]{40}$/.test(previous)) throw new Error(`Missing or invalid upstream baseline: ${marker}`);
	const dirty = await run(cwd, env, ["git", "status", "--porcelain=v1", "--untracked-files=all", "--", owner]);
	if (dirty.status) throw new Error(dirty.stderr);
	if (dirty.stdout) throw new Error("Managed openai-docs has local working-tree or index changes; finish them before updating.");
	console.log("Checking managed openai-docs upstream tree on GitHub.");
	const upstream = await run(cwd, env, ["gh", "api", "repos/openai/codex/contents/codex-rs/skills/src/assets/samples?ref=main",
		"--jq", '.[] | select(.name == "openai-docs" and .type == "dir") | .sha']);
	if (upstream.status) throw new Error(`openai-docs upstream lookup failed: ${upstream.stderr}`);
	const target = upstream.stdout.trim();
	if (!/^[a-f0-9]{40}$/.test(target)) throw new Error("openai-docs upstream directory missing or invalid; preserving managed skill.");
	if (target !== previous) {
		const result = await dispatchAgent(
			cwd, env,
			`upstream update for openai-docs (${previous.slice(0, 12)} -> ${target.slice(0, 12)})`,
			`${openaiDocsUpdatePrompt}\nPrevious upstream tree: ${previous}\nTarget upstream tree: ${target}\n`,
		);
		if (result.status || !result.completed) throw new Error(`openai-docs update failed (exit ${result.status}, completed=${result.completed}). ${result.stderr}`);
		const committed = await run(cwd, env, ["git", "show", `HEAD:${marker}`]);
		const pending = await run(cwd, env, ["git", "status", "--porcelain=v1", "--untracked-files=all", "--", owner]);
		if (committed.status || committed.stdout.trim() !== target || pending.status || pending.stdout) {
			throw new Error("openai-docs update did not commit the complete skill and validated upstream baseline.");
		}
	}
	const checked = await run(cwd, env, ["skills-mgr", "check", "openai-docs"]);
	if (checked.status) throw new Error(`Updated openai-docs resource check failed: ${checked.stderr || checked.stdout}`);
	console.log(target === previous ? "Managed openai-docs is current and checked." : "Managed openai-docs upstream update committed and checked.");
	return true;
}


export async function maintain(cwd = homedir(), options: { leader?: string } = {}): Promise<void> {
	if (options.leader !== undefined) {
		const current = hostname();
		if (!matchesLeader(current, options.leader)) {
			console.log(`Skipping skills maintenance on ${current} (leader is ${options.leader}).`);
			return;
		}
	}
	const env = schedulerEnvironment();
	const cache = join(process.platform === "darwin" ? join(homedir(), "Library/Caches") : process.env.XDG_CACHE_HOME || join(homedir(), ".cache"), "skills-mgr");
	const release = await lock(join(cache, "maintenance.lock"));
	if (!release) { console.log("Skills maintenance already running."); return; }
	const snapshots = new Map<string, string | null>();
	const restore = async () => {
		const protectedDirectories = new Set<string>();
		for (const [path, original] of snapshots) {
			const absolute = join(cwd, path);
			const current = await Bun.file(absolute).exists() ? await readFile(absolute, "utf8") : null;
			if (current === original) continue;
			protectedDirectories.add(dirname(path));
			if (original === null) await unlink(absolute);
			else { await mkdir(dirname(absolute), { recursive: true }); await writeFile(absolute, original); }
		}
		return protectedDirectories;
	};
	try {
		const gitState = await run(cwd, env, ["git", "rev-parse", "--show-toplevel"]);
		if (gitState.status || gitState.stdout.trim() !== cwd) throw new Error("Skills maintenance must run in the home configuration repository.");
		for (const state of ["MERGE_HEAD", "rebase-merge", "rebase-apply", "CHERRY_PICK_HEAD", "REVERT_HEAD"]) {
			const path = await run(cwd, env, ["git", "rev-parse", "--git-path", state]);
			try { await access(resolve(cwd, path.stdout.trim())); } catch (error) {
				if ((error as NodeJS.ErrnoException).code === "ENOENT") continue;
				throw error;
			}
			throw new Error(`Finish Git ${state} before skills maintenance.`);
		}
		let failed = false;
		try { await commitBaseInstructions(cwd, env); } catch (error) {
			failed = true;
			console.error(`Base instruction refresh unresolved: ${(error as Error).message}`);
		}
		for (const { path } of await placeholderChanges(cwd, env)) {
			const absolute = join(cwd, path);
			snapshots.set(path, await Bun.file(absolute).exists() ? await readFile(absolute, "utf8") : null);
		}
		const registry = JSON.parse(await readFile(join(cwd, ".skills-mgr/.skills-mgr.json"), "utf8"));
		const names = Object.entries(registry.skills).filter(([, selection]) => (selection as { remote?: unknown }).remote).map(([name]) => name);
		let managedReady = false;
		try { managedReady = await updateOpenaiDocs(cwd, env); } catch (error) {
			failed = true;
			console.error(`Managed upstream update unresolved: ${(error as Error).message}`);
		}
		console.log("Refreshing remote skills (skills-mgr owns cache expiry).");
		const started = Date.now();
		const refresh = await run(cwd, env, ["skills-mgr", "refresh-runner"]);
		if (refresh.status) throw new Error(refresh.stderr);
		const failures = new Map<string, string>();
		for (const line of (await readOptional(join(cache, "refresh.log"))).split("\n")) {
			const timestamp = Date.parse(field(line, "time"));
			if (!Number.isFinite(timestamp) || timestamp < started || !line.includes('msg="remote skill update failed"')) continue;
			const error = field(line, "err");
			const name = field(line, "name");
			if (!names.includes(name)) continue;
			if (name && disappeared.test(error)) failures.set(name, error);
			else if (name) console.error(`Remote refresh unresolved for ${name}: ${error}`);
		}
		const sync = await run(cwd, env, ["skills-mgr", "sync"]);
		if (sync.status) {
			console.error(sync.stderr);
			const name = sync.stderr.match(/sync remote skill "([^"]+)":/)?.[1];
			if (name && disappeared.test(sync.stderr)) failures.set(name, sync.stderr);
		}
		const inspectPatch = async (name: string) => {
			const inspection = await run(cwd, env, ["skills-mgr", "inspect", name]);
			const report = JSON.parse(inspection.stdout);
			for (const owner of [report.resolved, ...(report.candidates ?? [])]) {
				if (owner?.remote_key && stalePatch.test(owner.error ?? "")) return owner.error as string;
			}
			return "";
		};
		console.log(`Inspecting ${names.length} remote skill owner(s).`);
		for (const name of names) {
			const error = await inspectPatch(name);
			if (error) failures.set(name, [failures.get(name), error].filter(Boolean).join("\n"));
		}
		for (const [name, diagnostic] of failures) {
			const result = await dispatchAgent(
				cwd, env,
				`repair for ${name}`,
				`${repairPrompt}\nSkill: ${JSON.stringify(name)}\nDiagnostic: ${JSON.stringify(diagnostic)}\n`,
			);
			if (result.status || !result.completed) {
				failed = true;
				console.error(`Repair failed for ${name} (exit ${result.status}, completed=${result.completed}). ${result.stderr}`);
			} else if (await inspectPatch(name)) {
				failed = true;
				console.error(`Repair left a stale patch for ${name}.`);
			} else console.log(`Repair agent completed for ${name}.`);
		}
		const finalSync = failures.size ? await run(cwd, env, ["skills-mgr", "sync"]) : sync;
		const protectedDirectories = await restore();
		if (protectedDirectories.size) console.log(`Preserved manual edits in ${protectedDirectories.size} placeholder directory(s); those updates remain uncommitted.`);
		if (!finalSync.status) {
			const updated = JSON.parse(await readFile(join(cwd, ".skills-mgr/.skills-mgr.json"), "utf8"));
			const updatedNames = Object.entries(updated.skills).filter(([, selection]) => (selection as { remote?: unknown }).remote).map(([name]) => name);
			await commitPlaceholders(cwd, env, new Set([...names, ...updatedNames, ...(managedReady ? ["openai-docs"] : [])]), protectedDirectories);
		}
		if (failed || finalSync.status) throw new Error(finalSync.stderr || "Skills maintenance remains unresolved; see diagnostics above.");
		console.log("Skills maintenance complete.");
	} finally {
		try { await restore(); } finally { await release(); }
	}
}

function parseArgs(argv: string[]): { version?: boolean; leader?: string } | null {
	if (argv.length === 1 && argv[0] === "--version") return { version: true };
	let leader: string | undefined;
	for (let i = 0; i < argv.length; i++) {
		const arg = argv[i];
		if (arg === "--leader") {
			if (leader !== undefined || i + 1 >= argv.length) return null;
			leader = argv[++i].trim();
			if (!leader) return null;
		} else if (arg.startsWith("--leader=")) {
			if (leader !== undefined) return null;
			leader = arg.slice("--leader=".length).trim();
			if (!leader) return null;
		} else return null;
	}
	return { leader };
}

if (import.meta.main) {
	const parsed = parseArgs(process.argv.slice(2));
	if (!parsed) {
		console.error("Usage: skills-maintenance [--leader <host>] [--version]");
		process.exitCode = 2;
	} else if (parsed.version) console.log(VERSION);
	else {
		for (const signal of ["SIGINT", "SIGTERM"] as const) process.once(signal, () => { stopped = true; active?.kill(signal); });
		try { await maintain(homedir(), { leader: parsed.leader }); } catch (error) { console.error(`skills-maintenance: ${(error as Error).message}`); process.exitCode = 1; }
	}
}

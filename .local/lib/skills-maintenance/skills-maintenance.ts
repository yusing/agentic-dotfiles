import { spawn, type ChildProcess } from "node:child_process";
import { access, mkdir, open, readFile, unlink, writeFile } from "node:fs/promises";
import { dlopen, read } from "bun:ffi";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { createInterface } from "node:readline";
import type { Readable } from "node:stream";
import { repairPrompt } from "./repair-prompt";

export const VERSION = "1.0.0";
const roots = [".agents/skills", ".claude/skills"];
const disappeared = /does not contain skill|0 matching skills|remote skill name .+ does not match SKILL\.md name|remote skill .+ (?:is missing|has invalid) SKILL\.md|repository not found|repository .+ not found|\b(?:404|410)\b/i;
const stalePatch = /remote skill patch no longer applies/i;
let active: ChildProcess | undefined;
let stopped = false;

function schedulerEnvironment(): NodeJS.ProcessEnv {
	const env: NodeJS.ProcessEnv = { ...process.env, SKILLS_MGR_NO_REFRESH: "1", GIT_TERMINAL_PROMPT: "0" };
	for (const key of Object.keys(env)) {
		if (key.startsWith("MEKUGI_") || /^(CODEX_THREAD_ID|CODEX_SESSION_ID|CODEX_TOOL_CALL_ID|CODEX_ROLLOUT_TRACE_ROOT)$/.test(key)) delete env[key];
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

async function run(cwd: string, env: NodeJS.ProcessEnv, args: string[], prompt?: string) {
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
	child.stdin!.end(prompt);
	const [status, stdout, stderr] = await Promise.all([done, collect(child.stdout!, prompt !== undefined), collect(child.stderr!)]);
	active = undefined;
	return { status, stdout, stderr, completed };
}

async function readOptional(path: string): Promise<string> {
	try { return await readFile(path, "utf8"); } catch (error) {
		if ((error as NodeJS.ErrnoException).code === "ENOENT") return "";
		throw error;
	}
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

export async function maintain(cwd = homedir()): Promise<void> {
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
		for (const { path } of await placeholderChanges(cwd, env)) {
			const absolute = join(cwd, path);
			snapshots.set(path, await Bun.file(absolute).exists() ? await readFile(absolute, "utf8") : null);
		}
		const registry = JSON.parse(await readFile(join(cwd, ".skills-mgr/.skills-mgr.json"), "utf8"));
		const names = Object.entries(registry.skills).filter(([, selection]) => (selection as { remote?: unknown }).remote).map(([name]) => name);
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
		let failed = false;
		for (const [name, diagnostic] of failures) {
			console.log(`Starting gpt-6.1-terra repair for ${name}.`);
			const result = await run(cwd, env, ["mekugi", "codex", "headless", "--yolo", "-m", "gpt-6.1-terra"], `${repairPrompt}\nSkill: ${JSON.stringify(name)}\nDiagnostic: ${JSON.stringify(diagnostic)}\n`);
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
			await commitPlaceholders(cwd, env, new Set([...names, ...updatedNames]), protectedDirectories);
		}
		if (failed || finalSync.status) throw new Error(finalSync.stderr || "A repair agent failed; see diagnostics above.");
		console.log("Skills maintenance complete.");
	} finally {
		try { await restore(); } finally { await release(); }
	}
}

if (import.meta.main) {
	if (process.argv[2] === "--version") console.log(VERSION);
	else if (process.argv.length > 2) { console.error("Usage: skills-maintenance [--version]"); process.exitCode = 2; }
	else {
		for (const signal of ["SIGINT", "SIGTERM"] as const) process.once(signal, () => { stopped = true; active?.kill(signal); });
		try { await maintain(); } catch (error) { console.error(`skills-maintenance: ${(error as Error).message}`); process.exitCode = 1; }
	}
}

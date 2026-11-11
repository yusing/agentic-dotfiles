import { createHash, randomUUID } from "node:crypto";
import { chmodSync, mkdirSync, readFileSync, renameSync, statSync, unlinkSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const VERSION = "1.0.1";
type Json = Record<string, unknown>;
type Window = { used: number; reset_at: number };
type Usage = { windows: { five_hour?: Window; weekly?: Window }; banked?: number };
const env = process.env;
const now = env.HERDR_STATUS_NOW === undefined ? Date.now() / 1000 : Number(env.HERDR_STATUS_NOW);
const state = env.HERDR_STATUS_STATE_DIR || join(env.XDG_CACHE_HOME || join(homedir(), ".cache"), "herdr-status");

function object(value: unknown): Json {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? value as Json : {};
}
function readJson(path: string): Json {
  return object(JSON.parse(readFileSync(path, "utf8")));
}
async function requestJson(url: string, headers: Record<string, string>): Promise<Json> {
  if (url.startsWith("file:")) return readJson(fileURLToPath(url));
  const response = await fetch(url, { headers, signal: AbortSignal.timeout(4000) });
  if (!response.ok) throw new Error("Usage request failed");
  return object(await response.json());
}
function timestamp(value: unknown): number {
  return typeof value === "number" ? value : typeof value === "string" ? Date.parse(value) / 1000 : NaN;
}
function window(used: unknown, reset: number): Window | undefined {
  return typeof used === "number" && Number.isFinite(used) && Number.isFinite(reset) && reset > now
    ? { used, reset_at: reset } : undefined;
}
function cachedUsage(raw: Json): Usage {
  const windows = object(raw.windows);
  // Preserve still-valid weekly data from the previous single-window cache on fetch failure.
  const weekly = object(raw.windows === undefined ? raw : windows.weekly);
  const five = object(windows.five_hour);
  return {
    windows: { five_hour: window(five.used, timestamp(five.reset_at)), weekly: window(weekly.used, timestamp(weekly.reset_at)) },
    banked: typeof raw.banked === "number" && Number.isFinite(raw.banked) ? raw.banked : undefined,
  };
}
function hasUsage(usage: Usage): boolean {
  return Boolean(usage.windows.five_hour || usage.windows.weekly);
}
function writeCache(path: string, data: Usage | { reset_at: 0 }): void {
  const temporary = join(dirname(path), `.${randomUUID()}.json`);
  try {
    writeFileSync(temporary, `${JSON.stringify(data)}\n`, { mode: 0o600, flag: "wx" });
    renameSync(temporary, path);
  } finally {
    try { unlinkSync(temporary); } catch { /* Renamed or never created. */ }
  }
}
async function cacheRecord(provider: string, auth: string, fetchUsage: () => Promise<Usage>): Promise<Usage> {
  const path = join(state, `${provider}-usage.json`);
  let cached: Usage = { windows: {} };
  let raw: Json = {};
  try { raw = readJson(path); cached = cachedUsage(raw); } catch { /* Missing or malformed cache. */ }
  let fresh = false;
  try {
    const cacheTime = statSync(path).mtimeMs / 1000;
    fresh = now - cacheTime < 180 && cacheTime >= statSync(auth).mtimeMs / 1000;
  } catch { /* A missing credential store still permits Claude's local fallback. */ }
  if (fresh) {
    // Upgrade legacy weekly caches on the first redraw so available 5h data is not hidden.
    if (raw.windows !== undefined && hasUsage(cached)) return cached;
    if (raw.reset_at === 0) throw new Error("Cached failure");
  }
  try {
    const current = await fetchUsage();
    if (!hasUsage(current)) throw new Error("No current usage windows");
    writeCache(path, current);
    return current;
  } catch (error) {
    if (hasUsage(cached)) {
      writeCache(path, cached);
      return cached;
    }
    writeCache(path, { reset_at: 0 });
    throw error;
  }
}
async function codexUsage(): Promise<Usage> {
  const authPath = env.HERDR_STATUS_CODEX_AUTH || join(env.CODEX_HOME || join(homedir(), ".codex"), "auth.json");
  return cacheRecord("codex", authPath, async () => {
    const auth = readJson(authPath), tokens = object(auth.tokens);
    const token = auth.access_token || tokens.access_token;
    const account = auth.account_id || tokens.account_id;
    if (typeof token !== "string" || typeof account !== "string") throw new Error("Missing credentials");
    const payload = await requestJson(env.HERDR_STATUS_CODEX_USAGE_URL || "https://chatgpt.com/backend-api/wham/usage", {
      Authorization: `Bearer ${token}`, "ChatGPT-Account-Id": account, "User-Agent": "herdr-status/1",
    });
    const rate = object(payload.rate_limit);
    const windows: Usage["windows"] = {};
    for (const candidate of [rate.primary_window, rate.secondary_window]) {
      const item = object(candidate);
      const key = item.limit_window_seconds === 18000 ? "five_hour" : item.limit_window_seconds === 604800 ? "weekly" : null;
      if (!key) continue;
      const relative = item.reset_after_seconds;
      const reset = relative !== undefined && relative !== null ? now + Number(relative)
        : Number(item.reset_at ?? NaN);
      const parsed = window(item.used_percent, reset);
      if (parsed) windows[key] = parsed;
    }
    const banked = object(payload.rate_limit_reset_credits).available_count;
    return { windows, banked: typeof banked === "number" && Number.isFinite(banked) ? banked : undefined };
  });
}
async function claudeUsage(): Promise<Usage> {
  const configDir = resolve(env.CLAUDE_CONFIG_DIR || join(homedir(), ".claude"));
  const authPath = env.HERDR_STATUS_CLAUDE_AUTH || join(configDir, ".credentials.json");
  return cacheRecord("claude", authPath, async () => {
    try {
      const auth = object(readJson(authPath).claudeAiOauth);
      if (typeof auth.accessToken !== "string") throw new Error("Missing credentials");
      const payload = await requestJson(env.HERDR_STATUS_CLAUDE_USAGE_URL || "https://api.anthropic.com/api/oauth/usage", {
        Authorization: `Bearer ${auth.accessToken}`, "anthropic-beta": "oauth-2025-04-20",
        "anthropic-version": "2023-06-01", "User-Agent": "claude-code/2",
      });
      const five = object(payload.five_hour), weekly = object(payload.seven_day);
      const usage: Usage = { windows: {
        five_hour: window(five.utilization, timestamp(five.resets_at)),
        weekly: window(weekly.utilization, timestamp(weekly.resets_at)),
      } };
      if (!hasUsage(usage)) throw new Error("No current usage windows");
      return usage;
    } catch {
      const cacheDir = join(env.XDG_CACHE_HOME || join(homedir(), ".cache"), "ccstatusline");
      // ccstatusline scopes current caches to the resolved Claude config directory.
      const configHash = createHash("sha256").update(configDir).digest("hex").slice(0, 16);
      const paths = env.HERDR_STATUS_CLAUDE_USAGE_CACHE ? [env.HERDR_STATUS_CLAUDE_USAGE_CACHE]
        : [join(cacheDir, `usage-${configHash}.json`), join(cacheDir, "usage.json")];
      for (const path of paths) {
        try {
          const local = readJson(path);
          const usage: Usage = { windows: {
            five_hour: window(local.sessionUsage, timestamp(local.sessionResetAt)),
            weekly: window(local.weeklyUsage, timestamp(local.weeklyResetAt)),
          } };
          if (hasUsage(usage)) return usage;
        } catch { /* Older ccstatusline installations may only have the legacy cache. */ }
      }
      throw new Error("No local usage windows");
    }
  });
}
function renderWindow(label: string, value: Window): string {
  const remaining = Number(Math.max(0, Math.min(100, 100 - value.used)).toPrecision(6));
  const total = Math.floor(Math.max(0, value.reset_at - now) / 60);
  const days = Math.floor(total / 1440), hours = Math.floor(total % 1440 / 60), minutes = total % 60;
  const countdown = `${days ? `${days}d` : ""}${hours ? `${hours}h` : ""}${minutes || (!days && !hours) ? `${minutes}m` : ""}`;
  return `${label ? `${label} ` : ""}${remaining}% -${countdown}`;
}

if (process.argv[2] === "--version") console.log(VERSION);
else {
  try {
    const provider = process.argv[2];
    if (provider !== "codex" && provider !== "claude") throw new Error("Unknown provider");
    mkdirSync(state, { recursive: true, mode: 0o700 });
    chmodSync(state, 0o700);
    const usage = await (provider === "codex" ? codexUsage() : claudeUsage());
    const parts: string[] = [];
    const both = Boolean(usage.windows.five_hour && usage.windows.weekly);
    if (usage.windows.five_hour) parts.push(renderWindow(both ? "5h" : "", usage.windows.five_hour));
    if (usage.windows.weekly) {
      const banked = usage.banked && usage.banked > 0 ? ` +${Math.trunc(usage.banked)}b` : "";
      parts.push(renderWindow(both ? "W" : "", usage.windows.weekly) + banked);
    }
    if (parts.length) console.log(`${provider === "codex" ? "" : ""} ${parts.join(" | ")}`);
  } catch { /* Optional status modules fail silently without hiding neighboring items. */ }
}

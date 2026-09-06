import { createHash } from "crypto";
import * as fs from "fs";
import * as path from "path";

export const VERSION = "1.0.0";
export const DEFAULT_STATE_MAX_AGE_SECONDS = 7 * 24 * 60 * 60;

export function eventSessionId(event: Record<string, unknown>): string | undefined {
  const sessionId = event.session_id;
  if (typeof sessionId !== "string" || sessionId.length === 0) {
    return undefined;
  }
  return sessionId;
}

export function digest(...parts: string[]): string {
  return createHash("sha256").update(parts.join("\0")).digest("hex");
}

export function sessionDigest(event: Record<string, unknown>): string | undefined {
  const sessionId = eventSessionId(event);
  if (sessionId === undefined) {
    return undefined;
  }
  return digest(sessionId);
}

export function agentDigest(event: Record<string, unknown>): string | undefined {
  for (const field of ["agent_id", "agent_type"] as const) {
    const value = event[field];
    if (typeof value === "string" && value.trim().length > 0) {
      return digest(field, value.trim());
    }
  }
  return undefined;
}

export function sessionStateDir(
  event: Record<string, unknown>,
  stateRoot: string,
): string | undefined {
  const key = sessionDigest(event);
  if (key === undefined) {
    return undefined;
  }
  return path.join(stateRoot, key);
}

export function sessionStateFile(
  event: Record<string, unknown>,
  stateRoot: string,
  suffix = "",
): string | undefined {
  const key = sessionDigest(event);
  if (key === undefined) {
    return undefined;
  }
  return path.join(stateRoot, `${key}${suffix}`);
}

export function pruneOldEntries(
  root: string,
  options: {
    maxAgeSeconds?: number;
    directories?: boolean;
    files?: boolean;
  } = {},
): void {
  const maxAgeSeconds = options.maxAgeSeconds ?? DEFAULT_STATE_MAX_AGE_SECONDS;
  const directories = options.directories ?? true;
  const files = options.files ?? false;
  const cutoff = Date.now() / 1000 - maxAgeSeconds;
  let candidates: string[];
  try {
    candidates = fs.readdirSync(root).map((name) => path.join(root, name));
  } catch {
    return;
  }
  for (const candidate of candidates) {
    try {
      const stat = fs.statSync(candidate);
      if (directories && stat.isDirectory() && stat.mtimeMs / 1000 < cutoff) {
        fs.rmSync(candidate, { recursive: true, force: true });
      } else if (files && stat.isFile() && stat.mtimeMs / 1000 < cutoff) {
        fs.unlinkSync(candidate);
      }
    } catch {
      continue;
    }
  }
}

export function hasLiveCommandSession(value: unknown): boolean {
  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    const record = value as Record<string, unknown>;
    const sessionId = record.session_id;
    if (
      (typeof sessionId === "number" || typeof sessionId === "string") &&
      typeof sessionId !== "boolean"
    ) {
      return true;
    }
    return Object.values(record).some((nested) => hasLiveCommandSession(nested));
  }
  if (Array.isArray(value)) {
    return value.some((nested) => hasLiveCommandSession(nested));
  }
  return false;
}

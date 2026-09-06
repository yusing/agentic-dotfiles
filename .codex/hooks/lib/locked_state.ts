import * as fs from "fs";
import * as path from "path";

export const VERSION = "1.0.1";

const LOCK_EX = 2;
const LOCK_UN = 8;

declare function flock(fd: number, operation: number): number;

function applyLock(fd: number, operation: number): void {
  const result = flock(fd, operation);
  if (result !== 0) {
    throw Object.assign(new Error(`EIO: flock ${operation} failed`), { code: "EIO" });
  }
}

function isAcquireFailure(error: unknown): boolean {
  return error instanceof Error && typeof (error as { code?: string }).code === "string";
}

function acquireDirLock(dirPath: string, create: boolean): { dir: string; fd: number } {
  if (create) {
    ensurePrivateDir(dirPath);
  } else if (!fs.existsSync(dirPath)) {
    throw Object.assign(new Error(`ENOENT: ${dirPath}`), { code: "ENOENT" });
  }
  const lockPath = path.join(dirPath, ".lock");
  const descriptor = fs.openSync(lockPath, "a+");
  fs.chmodSync(lockPath, 0o600);
  try {
    applyLock(descriptor, LOCK_EX);
  } catch (error) {
    fs.closeSync(descriptor);
    throw error;
  }
  return { dir: dirPath, fd: descriptor };
}

function releaseDirLock(fd: number): void {
  try {
    applyLock(fd, LOCK_UN);
  } catch {
    // unlock best-effort
  }
  fs.closeSync(fd);
}

export function ensurePrivateDir(dirPath: string): void {
  fs.mkdirSync(dirPath, { recursive: true, mode: 0o700 });
  fs.chmodSync(dirPath, 0o700);
}

export function withLockedDir<T>(
  dirPath: string,
  body: (locked: string) => T,
  create = true,
): T {
  const acquired = acquireDirLock(dirPath, create);
  try {
    return body(acquired.dir);
  } finally {
    releaseDirLock(acquired.fd);
  }
}

export function tryLockedDir<T>(
  dirPath: string | undefined,
  body: (locked: string | undefined) => T,
  create = true,
): T {
  if (dirPath === undefined) {
    return body(undefined);
  }
  let acquired: { dir: string; fd: number };
  try {
    acquired = acquireDirLock(dirPath, create);
  } catch (error) {
    if (isAcquireFailure(error)) {
      return body(undefined);
    }
    throw error;
  }
  try {
    return body(acquired.dir);
  } finally {
    releaseDirLock(acquired.fd);
  }
}

export function withLockedFile<T>(
  filePath: string,
  body: (fd: number) => T,
  createParent = false,
): T {
  if (createParent) {
    ensurePrivateDir(path.dirname(filePath));
  }
  const descriptor = fs.openSync(filePath, "a");
  fs.chmodSync(filePath, 0o600);
  try {
    applyLock(descriptor, LOCK_EX);
    return body(descriptor);
  } finally {
    try {
      applyLock(descriptor, LOCK_UN);
    } catch {
      // unlock best-effort
    }
    fs.closeSync(descriptor);
  }
}

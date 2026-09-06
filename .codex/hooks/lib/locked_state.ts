import * as fs from "fs";
import * as path from "path";

export const VERSION = "1.0.0";

export function ensurePrivateDir(dirPath: string): void {
  fs.mkdirSync(dirPath, { recursive: true, mode: 0o700 });
  fs.chmodSync(dirPath, 0o700);
}

export function withLockedDir<T>(
  dirPath: string,
  body: (locked: string) => T,
  create = true,
): T {
  if (create) {
    ensurePrivateDir(dirPath);
  } else if (!fs.existsSync(dirPath)) {
    throw Object.assign(new Error(`ENOENT: ${dirPath}`), { code: "ENOENT" });
  }
  const lockPath = path.join(dirPath, ".lock");
  const descriptor = fs.openSync(lockPath, "a+", 0o600);
  try {
    return body(dirPath);
  } finally {
    fs.closeSync(descriptor);
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
  try {
    return withLockedDir(dirPath, (locked) => body(locked), create);
  } catch (error) {
    if (error instanceof Error && (error as { code?: string }).code === "ENOENT") {
      return body(undefined);
    }
    if (error instanceof Error && error.message.startsWith("ENOENT:")) {
      return body(undefined);
    }
    throw error;
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
  const descriptor = fs.openSync(filePath, "a", 0o600);
  try {
    return body(descriptor);
  } finally {
    fs.closeSync(descriptor);
  }
}

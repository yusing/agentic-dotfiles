import * as fs from "fs";
import * as path from "path";
import { deny } from "./lib/hook_response.ts";
import {
  asString,
  handleVersion,
  isRecord,
  readEvent,
  replaceAll,
  replaceOnce,
  runMain,
  writeJson,
} from "./lib/hook_runtime.ts";

export const VERSION = "1.0.2";

const MARKER_GENERATED = "Code generated";
const MARKER_DO_NOT_EDIT = "DO NOT EDIT";
export const REJECTION_REASON =
  "Generated artifact mutation not allowed. Edit the authoritative source this file " +
  "is generated from, then rerun its generator. Do not edit the generated output.";
const PATCH_OPERATIONS = ["Add", "Delete", "Update"] as const;

function patchHeader(line: string): { operation: string; path: string } | undefined {
  if (!line.startsWith("*** ")) {
    return undefined;
  }
  const rest = line.slice(4);
  for (const operation of PATCH_OPERATIONS) {
    const marker = `${operation} File: `;
    if (rest.startsWith(marker)) {
      return { operation, path: rest.slice(marker.length).trim() };
    }
  }
  return undefined;
}

function patchFileMatches(value: string): Array<{ operation: string; path: string }> {
  const matches: Array<{ operation: string; path: string }> = [];
  for (const line of value.split("\n")) {
    const header = patchHeader(line.replace(/\r$/, ""));
    if (header !== undefined && header.path.length > 0) {
      matches.push(header);
    }
  }
  return matches;
}

function patchSectionMatches(
  patch: string,
): Array<{ operation: string; path: string; body: string }> {
  const matches: Array<{ operation: string; path: string; body: string }> = [];
  const lines = patch.split("\n");
  let current: { operation: string; path: string; bodyLines: string[] } | undefined;
  const flush = (): void => {
    if (current === undefined) {
      return;
    }
    matches.push({
      operation: current.operation,
      path: current.path,
      body: current.bodyLines.join("\n"),
    });
    current = undefined;
  };
  for (const raw of lines) {
    const line = raw.replace(/\r$/, "");
    if (line === "*** End Patch") {
      flush();
      continue;
    }
    const header = patchHeader(line);
    if (header !== undefined) {
      flush();
      current = { operation: header.operation, path: header.path, bodyLines: [] };
      continue;
    }
    if (current !== undefined) {
      current.bodyLines.push(raw.replace(/\r$/, ""));
    }
  }
  flush();
  return matches;
}

export function isGeneratedGoSource(source: string): boolean {
  let index = 0;
  let inBlockComment = false;
  let inDoubleQuote = false;
  let inRawString = false;
  let inRune = false;
  let escaped = false;

  while (index < source.length) {
    const character = source[index] ?? "";
    const following = source[index + 1] ?? "";

    if (inBlockComment) {
      const end = source.indexOf("*/", index);
      const commentEnd = end < 0 ? source.length : end;
      const comment = source.slice(index, commentEnd);
      if (comment.includes(MARKER_GENERATED) && comment.includes(MARKER_DO_NOT_EDIT)) {
        return true;
      }
      if (end < 0) {
        return false;
      }
      inBlockComment = false;
      index = end + 2;
      continue;
    }

    if (inDoubleQuote || inRune) {
      if (escaped) {
        escaped = false;
      } else if (character === "\\") {
        escaped = true;
      } else if ((inDoubleQuote && character === '"') || (inRune && character === "'")) {
        inDoubleQuote = false;
        inRune = false;
      }
      index += 1;
      continue;
    }

    if (inRawString) {
      if (character === "`") {
        inRawString = false;
      }
      index += 1;
      continue;
    }

    if (character === "/" && following === "/") {
      const end = source.indexOf("\n", index + 2);
      const commentEnd = end < 0 ? source.length : end;
      const comment = source.slice(index + 2, commentEnd);
      if (comment.includes(MARKER_GENERATED) && comment.includes(MARKER_DO_NOT_EDIT)) {
        return true;
      }
      index = commentEnd;
      continue;
    }
    if (character === "/" && following === "*") {
      inBlockComment = true;
      index += 2;
      continue;
    }
    if (/[A-Za-z_]/.test(character)) {
      let end = index + 1;
      while (end < source.length && /[A-Za-z0-9_]/.test(source[end] ?? "")) {
        end += 1;
      }
      if (source.slice(index, end) === "package") {
        return false;
      }
      index = end;
      continue;
    }

    if (character === '"') {
      inDoubleQuote = true;
    } else if (character === "'") {
      inRune = true;
    } else if (character === "`") {
      inRawString = true;
    }
    index += 1;
  }
  return false;
}

export function isGeneratedGoFile(filePath: string): boolean {
  if (path.extname(filePath) !== ".go") {
    return false;
  }
  try {
    const stat = fs.statSync(filePath);
    if (!stat.isFile()) {
      return false;
    }
    const source = fs.readFileSync(filePath, "utf8");
    return isGeneratedGoSource(source);
  } catch {
    return false;
  }
}

function resolvePath(rawPath: string, cwd: string): string {
  const expanded = rawPath.startsWith("~/")
    ? path.join(process.env.HOME ?? "", rawPath.slice(2))
    : rawPath;
  return path.resolve(cwd, expanded);
}

function targetPaths(event: Record<string, unknown>): string[] {
  const toolInput = event.tool_input;
  if (!isRecord(toolInput)) {
    return [];
  }
  const rawPaths: string[] = [];
  for (const key of ["file_path", "path"]) {
    const value = toolInput[key];
    if (typeof value === "string" && value.length > 0) {
      rawPaths.push(value);
    }
  }
  for (const key of ["command", "patch", "input"]) {
    const value = toolInput[key];
    if (typeof value === "string") {
      for (const found of patchFileMatches(value)) {
        if (found.path.length > 0) {
          rawPaths.push(found.path);
        }
      }
    }
  }
  const cwdValue = asString(event.cwd);
  const cwd = cwdValue && cwdValue.length > 0 ? cwdValue : process.cwd();
  const paths: string[] = [];
  const seen = new Set<string>();
  for (const rawPath of rawPaths) {
    const resolved = resolvePath(rawPath, cwd);
    if (!seen.has(resolved)) {
      paths.push(resolved);
      seen.add(resolved);
    }
  }
  return paths;
}

function addedLines(body: string): string[] {
  return body.split(/\r?\n/).filter((line) => line.startsWith("+")).map((line) => line.slice(1));
}

function replaceHunk(source: string[], hunk: string): string[] | undefined {
  const before: string[] = [];
  const after: string[] = [];
  for (const line of hunk.split(/\r?\n/)) {
    if (line.length === 0) {
      continue;
    }
    if (line.startsWith("+")) {
      after.push(line.slice(1));
    } else if (line.startsWith("-")) {
      before.push(line.slice(1));
    } else if (line.startsWith(" ")) {
      before.push(line.slice(1));
      after.push(line.slice(1));
    } else if (line !== "\\ No newline at end of file") {
      before.push(line);
      after.push(line);
    }
  }
  if (before.length === 0) {
    return undefined;
  }
  const limit = source.length - before.length + 1;
  for (let index = 0; index < Math.max(limit, 0); index += 1) {
    if (source.slice(index, index + before.length).every((line, offset) => line === before[offset])) {
      return [...source.slice(0, index), ...after, ...source.slice(index + before.length)];
    }
  }
  return undefined;
}

function updatedSource(filePath: string, body: string): string | undefined {
  let existing: string;
  try {
    existing = fs.readFileSync(filePath, "utf8");
  } catch {
    return undefined;
  }
  let source = existing.split(/\r?\n/);
  const hunks = body.split(/^@@[^\r\n]*\r?$/m).slice(1);
  if (hunks.length === 0) {
    return undefined;
  }
  for (let hunk of hunks) {
    hunk = hunk.split(/^\*\*\* Move to: /m)[0] ?? hunk;
    const updated = replaceHunk(source, hunk);
    if (updated === undefined) {
      return undefined;
    }
    source = updated;
  }
  const trailingNewline = existing.endsWith("\n") ? "\n" : "";
  return `${source.join("\n")}${trailingNewline}`;
}

function patchSources(patch: string, cwd: string): Array<[string, string]> {
  const proposed: Array<[string, string]> = [];
  for (const match of patchSectionMatches(patch)) {
    const operation = match.operation;
    if (operation === "Delete") {
      continue;
    }
    const filePath = resolvePath(match.path, cwd);
    const body = match.body;
    let source = operation === "Update" ? updatedSource(filePath, body) : undefined;
    if (source === undefined) {
      const additions = addedLines(body);
      if (additions.length === 0) {
        continue;
      }
      source = additions.join("\n");
    }
    proposed.push([filePath, source]);
  }
  return proposed;
}

function proposedSources(event: Record<string, unknown>): Array<[string, string]> {
  const toolInput = event.tool_input;
  if (!isRecord(toolInput)) {
    return [];
  }
  const cwdValue = asString(event.cwd);
  const cwd = cwdValue && cwdValue.length > 0 ? cwdValue : process.cwd();
  const proposed: Array<[string, string]> = [];
  const directPaths = targetPaths(event);
  const content = toolInput.content;
  if (typeof content === "string") {
    for (const filePath of directPaths) {
      proposed.push([filePath, content]);
    }
  }
  const newString = toolInput.new_string;
  if (typeof newString === "string") {
    const oldString = toolInput.old_string;
    const replaceAllOccurrences = toolInput.replace_all === true;
    for (const filePath of directPaths) {
      let existing: string;
      try {
        existing = fs.readFileSync(filePath, "utf8");
      } catch {
        proposed.push([filePath, newString]);
        continue;
      }
      if (typeof oldString === "string" && existing.includes(oldString)) {
        const next = replaceAllOccurrences
          ? replaceAll(existing, oldString, newString)
          : replaceOnce(existing, oldString, newString);
        proposed.push([filePath, next]);
      } else {
        proposed.push([filePath, newString]);
      }
    }
  }
  for (const key of ["command", "patch", "input"]) {
    const patch = toolInput[key];
    if (typeof patch === "string") {
      proposed.push(...patchSources(patch, cwd));
    }
  }
  return proposed;
}

export function responseFor(event: unknown): Record<string, unknown> | undefined {
  if (!isRecord(event)) {
    return undefined;
  }
  const existingGenerated = targetPaths(event).some((filePath) => isGeneratedGoFile(filePath));
  const proposedGenerated = proposedSources(event).some(
    ([filePath, source]) => path.extname(filePath) === ".go" && isGeneratedGoSource(source),
  );
  if (!existingGenerated && !proposedGenerated) {
    return undefined;
  }
  return deny(REJECTION_REASON);
}

function main(): number {
  if (handleVersion(VERSION)) {
    return 0;
  }
  const response = responseFor(readEvent());
  if (response !== undefined) {
    writeJson(response);
  }
  return 0;
}

runMain("generated_code_guard", main);

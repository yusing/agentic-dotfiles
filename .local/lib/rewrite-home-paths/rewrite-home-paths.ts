import { readFileSync, writeFileSync, lstatSync } from "node:fs";
import { resolve, extname } from "node:path";
import { parseTOML, type AST } from "toml-eslint-parser";
import { parseTree, createScanner, SyntaxKind, type Node, type ParseError } from "jsonc-parser";

export const VERSION = "1.0.0";
type Value = { raw: string } | Map<string, Value> | Value[];
type Edit = { start: number; end: number; text: string };
const quote = (s: string) => JSON.stringify(s).replaceAll("\x7f", "\\u007f");

export function homeReplacer(home: string, expandHome: boolean) {
  const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const boundary = "(?=/|[^\\w.-]|$)";
  const pattern = `(?<![\\w/])(?:${escape(home)}${boundary}|/(?:home|Users?)/[A-Za-z0-9_.-]+${boundary})${expandHome ? "|\\$HOME\\b" : ""}`;
  return (s: string) => s.replace(new RegExp(pattern, "g"), () => home);
}

export function rewriteConfig(text: string, format: string, home: string, expandHome: boolean): string {
  const replace = homeReplacer(home, expandHome);
  if (format !== ".toml" && format !== ".json") return replace(text);
  const edits: Edit[] = [];
  let collisions = false;
  function merge(a: Value, b: Value): Value {
    if (a instanceof Map && b instanceof Map) {
      for (const [key, value] of b) a.set(key, a.has(key) ? merge(a.get(key)!, value) : value);
      return a;
    }
    return b;
  }
  // Replay syntax nodes, not decoded object properties: implicit TOML parents
  // and inline dotted keys do not necessarily have object insertion order.
  function assign(root: Map<string, Value>, keys: string[], value: Value) {
    let target = root;
    for (const key of keys.slice(0, -1)) {
      const old = target.get(key);
      if (!(old instanceof Map)) {
        if (old !== undefined) collisions = true;
        target.set(key, new Map());
      }
      target = target.get(key) as Map<string, Value>;
    }
    const key = keys.at(-1)!;
    if (target.has(key)) {
      collisions = true;
      value = merge(target.get(key)!, value);
    }
    target.set(key, value);
  }
  function stringEdit(value: string, start: number, end: number): string {
    const updated = replace(value);
    if (updated !== value) edits.push({ start, end, text: quote(updated) });
    return updated;
  }
  let root: Value;
  let comments: string[];
  if (format === ".json") {
    const errors: ParseError[] = [];
    const ast = parseTree(text, errors, { allowTrailingComma: true });
    if (!ast || errors.length) throw new Error("invalid JSON configuration");
    function convert(node: Node): Value {
      if (node.type === "object") {
        const result = new Map<string, Value>();
        for (const property of node.children ?? []) {
          const [key, value] = property.children!;
          assign(result, [stringEdit(key.value, key.offset, key.offset + key.length)], convert(value));
        }
        return result;
      }
      if (node.type === "array") return (node.children ?? []).map(convert);
      if (node.type === "string") {
        const updated = stringEdit(node.value, node.offset, node.offset + node.length);
        return { raw: updated === node.value ? text.slice(node.offset, node.offset + node.length) : quote(updated) };
      }
      return { raw: text.slice(node.offset, node.offset + node.length) };
    }
    root = convert(ast);
    comments = [];
    const scanner = createScanner(text, false);
    for (let token = scanner.scan(); token !== SyntaxKind.EOF; token = scanner.scan()) {
      if (token === SyntaxKind.LineCommentTrivia || token === SyntaxKind.BlockCommentTrivia) {
        comments.push(text.slice(scanner.getTokenOffset(), scanner.getTokenOffset() + scanner.getTokenLength()));
      }
    }
  } else {
    const ast = parseTOML(text, { tomlVersion: "1.0" });
    root = new Map<string, Value>();
    comments = ast.comments.map(node => text.slice(...node.range));
    function keys(node: AST.TOMLKey): string[] {
      return node.keys.map(key => key.type === "TOMLBare" ? key.name : stringEdit(key.value, ...key.range));
    }
    function convert(node: AST.TOMLContentNode): Value {
      if (node.type === "TOMLInlineTable") {
        const result = new Map<string, Value>();
        for (const entry of node.body) assign(result, keys(entry.key), convert(entry.value));
        return result;
      }
      if (node.type === "TOMLArray") return node.elements.map(convert);
      if (node.kind === "string") {
        const updated = stringEdit(node.value, ...node.range);
        return { raw: updated === node.value ? text.slice(...node.range) : quote(updated) };
      }
      return { raw: text.slice(...node.range) };
    }
    // Keep distinct source arrays separate even if their rewritten names collide.
    const arrays = new Map<string, Value[]>();
    const tables = new Set<string>();
    for (const entry of ast.body[0].body) {
      if (entry.type === "TOMLKeyValue") {
        assign(root, keys(entry.key), convert(entry.value));
        continue;
      }
      keys(entry.key);
      let target = root;
      const path = entry.resolvedKey;
      const normalized = path.map(key => typeof key === "string" ? replace(key) : key);
      const identity = JSON.stringify(normalized);
      if (tables.has(identity)) collisions = true;
      tables.add(identity);
      for (let index = 0; index < path.length; index++) {
        const key = normalized[index] as string;
        const next = path[index + 1];
        if (typeof next === "number") {
          const source = JSON.stringify(path.slice(0, index + 1));
          let array = arrays.get(source);
          if (!array) {
            array = [];
            arrays.set(source, array);
          }
          if (target.get(key) !== array) {
            if (target.has(key)) collisions = true;
            target.set(key, array);
          }
          array[next] ??= new Map<string, Value>();
          target = array[next] as Map<string, Value>;
          index++;
        } else {
          const old = target.get(key);
          if (!(old instanceof Map)) {
            if (old !== undefined) collisions = true;
            target.set(key, new Map());
          }
          target = target.get(key) as Map<string, Value>;
        }
      }
      for (const item of entry.body) assign(target, keys(item.key), convert(item.value));
    }
  }
  if (!collisions) {
    for (const edit of edits.sort((a, b) => b.start - a.start)) {
      text = text.slice(0, edit.start) + edit.text + text.slice(edit.end);
    }
    return text;
  }
  function render(value: Value, indent = 0): string {
    if (Array.isArray(value)) return `[${value.map(item => render(item, indent)).join(", ")}]`;
    if (!(value instanceof Map)) return value.raw;
    const entries = [...value].map(([key, item]) => `${quote(key)}${format === ".toml" ? " = " : ": "}${render(item, indent + 2)}`);
    if (format === ".toml") return `{ ${entries.join(", ")} }`;
    return entries.length ? `{\n${entries.map(entry => " ".repeat(indent + 2) + entry).join(",\n")}\n${" ".repeat(indent)}}` : "{}";
  }
  function tomlTables(value: Map<string, Value>, path: string[] = []): string {
    const lines = path.length ? [`[${path.map(quote).join(".")}]`] : [];
    for (const [key, item] of value) if (!(item instanceof Map)) lines.push(`${quote(key)} = ${render(item)}`);
    for (const [key, item] of value) if (item instanceof Map) lines.push("", tomlTables(item, [...path, key]));
    return lines.join("\n");
  }
  // Reformat only collision files. Retain every comment in a leading block,
  // since merged sections no longer have a one-to-one source location.
  const output = (comments.length ? comments.join("\n") + "\n" : "") +
    (format === ".toml" ? tomlTables(root as Map<string, Value>) : render(root)) + "\n";
  if (format === ".toml") parseTOML(output, { tomlVersion: "1.0" });
  else {
    const errors: ParseError[] = [];
    parseTree(output, errors, { allowTrailingComma: true });
    if (errors.length) throw new Error("merged JSON configuration is invalid");
  }
  return output;
}

function isRuntimeConfig(name: string): boolean {
  if ([".claude/settings.json", ".codex/config.toml", ".codex/hooks.json", ".config/fish/config.fish", ".gitconfig", ".grok/config.toml", ".bashrc", ".zsh/fish-mirror.zsh", ".zshrc"].includes(name)) return true;
  if (name.startsWith(".claude/agents/")) return extname(name) === ".md";
  if (name.startsWith(".codex/agents/")) return extname(name) === ".toml";
  return (name.startsWith(".grok/hooks/") || name.startsWith(".config/")) && [".json", ".toml", ".yaml", ".yml"].includes(extname(name));
}

if (import.meta.main) {
  try {
    if (Bun.argv.slice(2).join(" ") === "--version") console.log(VERSION);
    else {
      if (Bun.argv.length > 2) throw new Error("usage: rewrite-home-paths [--version]");
      if (!process.env.HOME) throw new Error("HOME must be set");
      const home = resolve(process.env.HOME);
      const git = Bun.spawnSync(["git", "ls-files", "-z"], { cwd: home, stdout: "pipe", stderr: "pipe" });
      if (git.exitCode) throw new Error("cannot list tracked configuration");
      const changes: [string, string][] = [];
      for (const name of git.stdout.toString().split("\0")) {
        if (!isRuntimeConfig(name)) continue;
        const path = resolve(home, name);
        let stat;
        try { stat = lstatSync(path); } catch (error) {
          if ((error as NodeJS.ErrnoException).code === "ENOENT") continue;
          throw error;
        }
        if (!stat.isFile() || stat.isSymbolicLink()) continue;
        const text = readFileSync(path, "utf8");
        let output;
        try { output = rewriteConfig(text, extname(name), home, /^\.(claude|codex|grok)\//.test(name)); }
        catch { throw new Error(`cannot rewrite ${name}: invalid configuration`); }
        if (output !== text) changes.push([path, output]);
      }
      // Parse every candidate before changing any configuration.
      for (const [path, output] of changes) writeFileSync(path, output);
      if (changes.length) console.log(`==> resolved home paths in ${changes.length} configuration files`);
    }
  } catch (error) {
    console.error(`rewrite-home-paths: ${(error as Error).message}`);
    process.exitCode = 1;
  }
}

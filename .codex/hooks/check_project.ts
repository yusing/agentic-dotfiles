import * as fs from "fs";
import * as path from "path";
import { at, handleVersion, programArgs, runCommand } from "./lib/hook_runtime.ts";

export const VERSION = "1.0.0";

function languageFor(ext: string): string | undefined {
  switch (ext) {
    case "c":
      return "c";
    case "cc":
    case "cpp":
    case "cxx":
    case "hh":
    case "hpp":
    case "hxx":
      return "cpp";
    case "cs":
      return "csharp";
    case "css":
      return "css";
    case "dart":
      return "dart";
    case "ex":
    case "exs":
      return "elixir";
    case "go":
      return "go";
    case "htm":
    case "html":
      return "html";
    case "java":
      return "java";
    case "js":
    case "jsx":
    case "mjs":
    case "cjs":
      return "javascript";
    case "kt":
    case "kts":
      return "kotlin";
    case "lua":
      return "lua";
    case "php":
      return "php";
    case "py":
      return "python";
    case "rb":
      return "ruby";
    case "rs":
      return "rust";
    case "scala":
      return "scala";
    case "sh":
    case "bash":
    case "zsh":
    case "fish":
      return "shell";
    case "sql":
      return "sql";
    case "swift":
      return "swift";
    case "ts":
    case "tsx":
    case "mts":
    case "cts":
      return "typescript";
    case "zig":
      return "zig";
    default:
      return undefined;
  }
}
const LANGUAGE_ORDER = [
  "c",
  "cpp",
  "csharp",
  "css",
  "dart",
  "elixir",
  "go",
  "html",
  "java",
  "javascript",
  "kotlin",
  "lua",
  "php",
  "python",
  "ruby",
  "rust",
  "scala",
  "shell",
  "sql",
  "swift",
  "typescript",
  "zig",
];
const PRUNE_DIRS = new Set([
  ".git",
  ".svn",
  ".cache",
  "cache",
  "node_modules",
  "vendor",
  "dist",
  "build",
  "target",
  "coverage",
  ".venv",
  "venv",
  "__pycache__",
]);

function exists(target: string): boolean {
  try {
    fs.accessSync(target);
    return true;
  } catch {
    return false;
  }
}

function isDir(target: string): boolean {
  try {
    return fs.statSync(target).isDirectory();
  } catch {
    return false;
  }
}

function isFile(target: string): boolean {
  try {
    return fs.statSync(target).isFile();
  } catch {
    return false;
  }
}

function detectVcs(directory: string): { vcs: string; ancestor: string } {
  let ancestor = directory;
  let gitWithoutCommitAncestor = "";
  while (true) {
    if (exists(path.join(ancestor, ".git"))) {
      const head = runCommand(["git", "-C", ancestor, "rev-parse", "--verify", "HEAD"]);
      if (head.status === 0) {
        let vcs = "git";
        if (isDir(path.join(ancestor, ".svn"))) {
          vcs = "git+svn";
        }
        return { vcs, ancestor };
      }
      if (gitWithoutCommitAncestor.length === 0) {
        gitWithoutCommitAncestor = ancestor;
      }
    }
    if (isDir(path.join(ancestor, ".svn"))) {
      return { vcs: "svn", ancestor };
    }
    if (ancestor === "/") {
      if (gitWithoutCommitAncestor.length > 0) {
        return { vcs: "git", ancestor: gitWithoutCommitAncestor };
      }
      return { vcs: "none", ancestor };
    }
    const parent = path.dirname(ancestor);
    ancestor = parent.length > 0 ? parent : "/";
  }
}

function detectTaskRunner(directory: string, vcs: string, vcsAncestor: string): string {
  let runnerDirectory = directory;
  while (true) {
    let taskRunner = "none";
    if (isFile(path.join(runnerDirectory, ".shadowtree.toml"))) {
      taskRunner = "shadowtree";
    } else if (
      isFile(path.join(runnerDirectory, "Makefile")) ||
      isFile(path.join(runnerDirectory, "makefile")) ||
      isFile(path.join(runnerDirectory, "GNUmakefile"))
    ) {
      taskRunner = "make";
    } else if (
      isFile(path.join(runnerDirectory, "Justfile")) ||
      isFile(path.join(runnerDirectory, "justfile"))
    ) {
      taskRunner = "just";
    } else if (
      isFile(path.join(runnerDirectory, "Taskfile")) ||
      isFile(path.join(runnerDirectory, "Taskfile.yml")) ||
      isFile(path.join(runnerDirectory, "Taskfile.yaml"))
    ) {
      taskRunner = "task";
    }
    if (taskRunner !== "none" || vcs === "none" || runnerDirectory === vcsAncestor) {
      return taskRunner;
    }
    const parent = path.dirname(runnerDirectory);
    runnerDirectory = parent.length > 0 ? parent : "/";
  }
}

function walkFiles(directory: string): string[] {
  const files: string[] = [];
  const visit = (current: string): void => {
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(current, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const full = path.join(current, entry.name);
      let isDirectory = false;
      let isFileEntry = false;
      try {
        isDirectory = entry.isDirectory();
        isFileEntry = entry.isFile();
      } catch {
        continue;
      }
      if (isDirectory) {
        if (!PRUNE_DIRS.has(entry.name)) {
          visit(full);
        }
      } else if (isFileEntry) {
        files.push(full);
      }
    }
  };
  visit(directory);
  return files;
}

function listFiles(directory: string, vcs: string): string[] {
  if (vcs === "git" || vcs === "git+svn") {
    const listed = runCommand([
      "git",
      "-C",
      directory,
      "ls-files",
      "--cached",
      "--others",
      "--exclude-standard",
    ]);
    if (listed.status === 0) {
      return listed.stdout.split("\n").filter((line) => line.length > 0);
    }
  }
  return walkFiles(directory);
}

function detectLanguages(files: string[]): string {
  const found = new Set<string>();
  for (const file of files) {
    const ext = path.extname(file).slice(1).toLowerCase();
    const language = languageFor(ext);
    if (language !== undefined) {
      found.add(language);
    }
  }
  const ordered = LANGUAGE_ORDER.filter((language) => found.has(language));
  return ordered.length > 0 ? ordered.join(",") : "none";
}

function goVersion(directory: string): string {
  const manifest = path.join(directory, "go.mod");
  if (!isFile(manifest)) {
    return "unknown";
  }
  const match = /^go (.+)$/m.exec(fs.readFileSync(manifest, "utf8"));
  if (match === null || match.length < 2) {
    return "unknown";
  }
  const version = match[1].trim();
  return version.length > 0 ? version : "unknown";
}

function main(): number {
  if (handleVersion(VERSION)) {
    return 0;
  }
  const args = programArgs();
  let withoutGit = false;
  const positional: string[] = [];
  for (let index = 0; index < args.length; index += 1) {
    const argument = at(args, index) ?? "";
    if (argument === "--without-git") {
      withoutGit = true;
      continue;
    }
    if (argument === "--") {
      positional.push(...args.slice(index + 1));
      break;
    }
    if (argument.startsWith("-")) {
      process.stderr.write(`check_project: unknown option: ${argument}\n`);
      return 2;
    }
    positional.push(argument);
  }
  const directoryArg = at(positional, 0) ?? ".";
  if (!isDir(directoryArg)) {
    process.stderr.write(`check_project: not a directory: ${directoryArg}\n`);
    return 2;
  }
  const directory = fs.realpathSync(directoryArg);
  const { vcs, ancestor } = detectVcs(directory);
  const taskRunner = detectTaskRunner(directory, vcs, ancestor);
  const languages = detectLanguages(listFiles(directory, vcs));
  const version = goVersion(directory);
  let reportVcs = true;
  if (withoutGit && (vcs === "git" || vcs === "none")) {
    reportVcs = false;
  }
  if (reportVcs) {
    process.stdout.write(`vcs: ${vcs}\n`);
  }
  process.stdout.write(
    `task_runner: ${taskRunner}\nlanguages: ${languages}\ngo_version: ${version}\nproject_instructions: |\n`,
  );
  if (vcs !== "none" && reportVcs) {
    process.stdout.write(
      "  ## Version control\n  - Treat detected VCS as read-only unless user authorizes writes.\n",
    );
  }
  if (taskRunner !== "none") {
    process.stdout.write(
      `  ## Task runner\n  - Prefer \`${taskRunner}\` recipes over underlying raw commands.\n`,
    );
  }
  return 0;
}

process.exit(main());

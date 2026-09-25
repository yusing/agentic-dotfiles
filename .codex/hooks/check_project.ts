import * as fs from "fs";
import * as path from "path";
import { at, handleVersion, programArgs, runCommand } from "./lib/hook_runtime.ts";

export const VERSION = "1.2.0";

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

const HEAD_PREFIX = 8;

type VcsDetection = {
  kind: string;
  ancestor: string;
  label: string;
};

function commitPrefix(text: string): string {
  const sha = text.trim();
  if (sha.length === 0) {
    return "";
  }
  return sha.length > HEAD_PREFIX ? sha.slice(0, HEAD_PREFIX) : sha;
}

function gitBranch(directory: string): string {
  const branch = runCommand(["git", "-C", directory, "symbolic-ref", "--quiet", "--short", "HEAD"]);
  return branch.status === 0 ? branch.stdout.trim() : "";
}

function gitSuffix(branch: string, sha: string): string {
  const name = branch.length > 0 ? `@${branch}` : "";
  const commit = sha.length > 0 ? `@${sha}` : "";
  return `${name}${commit}`;
}

function gitLabel(branch: string, sha: string): string {
  return `git${gitSuffix(branch, sha)}`;
}

function svnRevision(directory: string): string {
  const info = runCommand([
    "svn",
    "info",
    "--non-interactive",
    "--show-item",
    "revision",
    "--",
    directory,
  ]);
  if (info.status !== 0) {
    return "";
  }
  const lineEnd = info.stdout.indexOf("\n");
  const revision = (lineEnd < 0 ? info.stdout : info.stdout.slice(0, lineEnd)).trim();
  if (revision.length === 0) {
    return "";
  }
  for (let index = 0; index < revision.length; index += 1) {
    const code = revision.charCodeAt(index);
    if (code <= 32) {
      return "";
    }
  }
  return revision;
}

function vcsLabel(kind: string, gitName: string, svnRev: string): string {
  const svn = svnRev.length > 0 ? `svn@r${svnRev}` : "svn";
  if (kind === "git+svn") {
    return `${gitName}+${svn}`;
  }
  if (kind === "git") {
    return gitName;
  }
  if (kind === "svn") {
    return svn;
  }
  return kind;
}

function detectVcs(directory: string): VcsDetection {
  let ancestor = directory;
  let gitWithoutCommitAncestor = "";
  while (true) {
    if (exists(path.join(ancestor, ".git"))) {
      const head = runCommand(["git", "-C", ancestor, "rev-parse", "--verify", "HEAD"]);
      if (head.status === 0) {
        const gitSha = commitPrefix(head.stdout);
        let kind = "git";
        let svnRev = "";
        if (isDir(path.join(ancestor, ".svn"))) {
          kind = "git+svn";
          svnRev = svnRevision(ancestor);
        }
        return { kind, ancestor, label: vcsLabel(kind, gitLabel(gitBranch(ancestor), gitSha), svnRev) };
      }
      if (gitWithoutCommitAncestor.length === 0) {
        gitWithoutCommitAncestor = ancestor;
      }
    }
    if (isDir(path.join(ancestor, ".svn"))) {
      const svnRev = svnRevision(ancestor);
      return { kind: "svn", ancestor, label: vcsLabel("svn", "", svnRev) };
    }
    if (ancestor === "/") {
      if (gitWithoutCommitAncestor.length > 0) {
        return { kind: "git", ancestor: gitWithoutCommitAncestor, label: gitLabel(gitBranch(gitWithoutCommitAncestor), "") };
      }
      return { kind: "none", ancestor, label: "none" };
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

type SubmoduleHead = {
  path: string;
  label: string;
};

function gitlinkPath(record: string): string {
  if (record.length === 0 || record.slice(0, 7) !== "160000 ") {
    return "";
  }
  const tab = record.indexOf("\t");
  if (tab < 0) {
    return "";
  }
  return record.slice(tab + 1);
}

// Require this directory's .git. Otherwise git -C reports a parent HEAD.
function submoduleHeadLabel(directory: string): string {
  if (!exists(path.join(directory, ".git"))) {
    return "";
  }
  const head = runCommand(["git", "-C", directory, "rev-parse", "--verify", "HEAD"]);
  return gitSuffix(gitBranch(directory), head.status === 0 ? commitPrefix(head.stdout) : "");
}

function compareSubmodulePath(left: SubmoduleHead, right: SubmoduleHead): number {
  if (left.path < right.path) {
    return -1;
  }
  if (left.path > right.path) {
    return 1;
  }
  return 0;
}

function listSubmodules(repository: string): SubmoduleHead[] {
  const entries: SubmoduleHead[] = [];
  const seen = new Set<string>();
  const visited = new Set<string>();
  const visit = (repo: string, prefix: string): void => {
    let real = "";
    try {
      real = fs.realpathSync(repo);
    } catch {
      return;
    }
    if (visited.has(real)) {
      return;
    }
    visited.add(real);
    const listed = runCommand(["git", "-C", repo, "ls-files", "-z", "--stage"]);
    if (listed.status !== 0) {
      return;
    }
    const records = listed.stdout.split("\0");
    for (let index = 0; index < records.length; index += 1) {
      const relative = gitlinkPath(at(records, index) ?? "");
      if (relative.length === 0) {
        continue;
      }
      const display = prefix.length > 0 ? `${prefix}/${relative}` : relative;
      if (seen.has(display)) {
        continue;
      }
      seen.add(display);
      const full = path.join(repo, relative);
      entries.push({ path: display, label: submoduleHeadLabel(full) });
      if (exists(path.join(full, ".git"))) {
        visit(full, display);
      }
    }
  };
  visit(repository, "");
  entries.sort(compareSubmodulePath);
  return entries;
}

function submoduleLines(entries: SubmoduleHead[]): string[] {
  const lines = ["submodules:"];
  for (const entry of entries) {
    if (entry.label.length > 0) {
      lines.push(`  - ${entry.path}${entry.label}`);
    } else {
      lines.push(`  - ${entry.path}`);
    }
  }
  return lines;
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
  const detected = detectVcs(directory);
  const kind = detected.kind;
  const ancestor = detected.ancestor;
  const taskRunner = detectTaskRunner(directory, kind, ancestor);
  const languages = detectLanguages(listFiles(directory, kind));
  const version = goVersion(directory);
  let reportVcs = true;
  if (withoutGit && (kind === "git" || kind === "none")) {
    reportVcs = false;
  }
  const lines: string[] = [];
  if (reportVcs) {
    lines.push(`vcs: ${detected.label}`);
  }
  if (kind === "git" || kind === "git+svn") {
    const submodules = listSubmodules(ancestor);
    if (submodules.length > 0) {
      lines.push(...submoduleLines(submodules));
    }
  }
  lines.push(
    `task_runner: ${taskRunner}`,
    `languages: ${languages}`,
    `go_version: ${version}`,
  );
  const instructions: string[] = [];
  if (kind !== "none" && reportVcs) {
    instructions.push(
      "  ## Version control",
      "  - Treat detected VCS as read-only unless user authorizes writes.",
    );
  }
  if (taskRunner !== "none") {
    instructions.push(
      "  ## Task runner",
      `  - Prefer \`${taskRunner}\` recipes over underlying raw commands.`,
    );
  }
  if (instructions.length > 0) {
    lines.push("project_instructions: |");
    for (const instruction of instructions) {
      lines.push(instruction);
    }
  }
  process.stdout.write(`<project>\n${lines.join("\n")}\n</project>\n`);
  return 0;
}

process.exit(main());

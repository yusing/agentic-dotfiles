import { copyFileSync, existsSync, mkdtempSync, openSync, readSync, closeSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { extname, join, resolve } from "node:path";
import { excludedPath, generatedHeader, SOURCE_EXTENSIONS } from "./scc-prod";

const VERSION = "1.0.0";
const extensions = new Set(SOURCE_EXTENSIONS.split(","));

function main(): void {
  const args = process.argv.slice(2);
  const production = args[0] === "--prod";
  if (production) args.shift();
  if (args.length === 1 && args[0] === "--version") {
    console.log(`git-diffstat ${VERSION}`);
    return;
  }
  const cwd = resolve(process.cwd(), process.env.GIT_PREFIX || ".");
  const env = { ...process.env };
  function git(args: string[], directory = cwd, allowDifference = false): string {
    const child = Bun.spawnSync(["git", ...args], { cwd: directory, env, stdout: "pipe", stderr: "pipe" });
    if (child.exitCode !== 0 && !(allowDifference && child.exitCode === 1)) {
      throw new Error(child.stderr.toString().trim() || `git exited with status ${child.exitCode}`);
    }
    return child.stdout.toString();
  }
  const root = git(["rev-parse", "--show-toplevel"]).trim();
  const separator = args.indexOf("--");
  const options = separator < 0 ? args : args.slice(0, separator);
  const paths = separator < 0 ? [] : args.slice(separator + 1);
  // Keep Git's implicit-path parsing when the caller did not supply --.
  function diffArgs(format: string[], inspection = false): string[] {
    const input = inspection ? options.filter(arg => !/^(--(?:exit-code|quiet|relative(?:=.*)?|stat(?:=.*)?|numstat|shortstat|summary|name-only|name-status|patch|no-patch)|-[psz])$/.test(arg)) : options;
    return separator < 0 ? [...format, ...input] : [...input, ...format, "--", ...paths];
  }
  const revisions = git(["rev-parse", "--revs-only", ...args]).trim().split("\n").filter(Boolean);
  const leadingCommit = args[0] && Bun.spawnSync(["git", "rev-parse", "--verify", "--end-of-options", `${args[0]}^{commit}`], { cwd, env, stdout: "ignore", stderr: "ignore" }).exitCode === 0;
  const show = leadingCommit && revisions.length === 1 && !options.some(arg => arg === "--cached" || arg === "--staged");
  const command = show ? ["show", "--format="] : ["diff"];
  let temporary: string | undefined;
  try {
    if (!show) {
      const index = resolve(root, git(["rev-parse", "--git-path", "index"], root).trim());
      temporary = mkdtempSync(join(tmpdir(), "git-diffstat-"));
      env.GIT_INDEX_FILE = join(temporary, "index");
      if (existsSync(index)) copyFileSync(index, env.GIT_INDEX_FILE);
      else git(["read-tree", "--empty"], root);
      git(["add", "-N", "--", "."], root);
    }
    const exclusions = new Set<string>();
    if (production) {
      // Git's merge numstat uses the first parent, unlike its default raw diff.
      const raw = git([...command, ...(show ? ["--diff-merges=first-parent"] : []), ...diffArgs(["--no-patch", "--raw", "--no-abbrev", "--no-color", "--no-relative", "-z"], true)], cwd, true).split("\0");
      for (let i = 0; i < raw.length && raw[i];) {
        const header = raw[i++].trim();
        const fields = header.split(" ");
        if (!header.startsWith(":")) throw new Error("cannot parse Git raw diff output");
        const status = fields.at(-1)!;
        const oldPath = raw[i++];
        const path = /^[RC]/.test(status) ? raw[i++] : oldPath;
        let excluded = excludedPath(path) || !extensions.has(extname(path).slice(1).toLowerCase());
        if (!excluded) {
          const oid = /^D+$/.test(status) ? fields.at(-3)! : fields.at(-2)!;
          let source: string;
          if (/^0+$/.test(oid)) {
            const file = openSync(join(root, path), "r");
            try {
              const buffer = Buffer.alloc(16384);
              source = buffer.subarray(0, readSync(file, buffer, 0, buffer.length, 0)).toString("utf8");
            } finally { closeSync(file); }
          } else source = git(["cat-file", "blob", oid]).slice(0, 16384);
          excluded = generatedHeader(source);
        }
        if (excluded) {
          if (status.startsWith("R")) exclusions.add(`:(top,exclude,literal)${oldPath}`);
          exclusions.add(`:(top,exclude,literal)${path}`);
        }
      }
    }
    const child = Bun.spawnSync(["git", ...command, ...diffArgs(["--numstat", "--shortstat"]), ...exclusions], { cwd, env, stdin: "inherit", stdout: "inherit", stderr: "inherit" });
    process.exitCode = child.exitCode;
  } finally { if (temporary) rmSync(temporary, { recursive: true, force: true }); }
}

try { main(); } catch (error) {
  console.error(`git-diffstat: ${error instanceof Error ? error.message : error}`);
  process.exitCode = 1;
}

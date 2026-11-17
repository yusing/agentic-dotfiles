import { mkdirSync, readFileSync, renameSync, unlinkSync, writeFileSync } from "node:fs";
import { isAbsolute, join, posix, relative, resolve, sep } from "node:path";

function git(root: string, args: string[]): string {
  const result = Bun.spawnSync(["git", "-C", root, ...args]);
  if (result.exitCode !== 0) throw new Error(result.stderr.toString().trim());
  return result.stdout.toString();
}

function buildConfig(root: string): Record<string, unknown> {
  try {
    const value = JSON.parse(readFileSync(join(root, "graphify-out", ".graphify_build.json"), "utf8"));
    if (typeof value !== "object" || value === null || Array.isArray(value)) throw new Error("invalid Graphify build config");
    return value;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    return {};
  }
}

function literalRule(path: string): string {
  return `/${path.replace(/[?*\[\]{}]/g, char => `[${char}]`).replaceAll("#", "\\#")}/`;
}

export function exclusionMatcher(rules: string[], root: string): (source: string) => boolean {
  const matchers = rules.flatMap(rule => {
    const pattern = rule.slice(1, -1);
    return [new Bun.Glob(pattern), new Bun.Glob(`${pattern}/**`)];
  });
  return source => {
    const path = (isAbsolute(source) ? relative(root, source) : source).replaceAll("\\", "/").replace(/^\.\//, "");
    return matchers.some(glob => glob.match(path));
  };
}

// Derive checkout-local scope, without creating or editing source configuration.
export function workspaceExclusions(root: string): string[] {
  const directory = resolve(root);
  const rules = new Set<string>();
  const probe = Bun.spawnSync(["git", "-C", directory, "rev-parse", "--show-toplevel"]);
  if (probe.exitCode === 0) {
    for (const entry of git(directory, ["ls-files", "--stage", "-z"]).split("\0")) {
      if (entry.startsWith("160000 ")) rules.add(literalRule(entry.slice(entry.indexOf("\t") + 1)));
    }
    for (const entry of git(directory, ["worktree", "list", "--porcelain", "-z"]).split("\0")) {
      if (!entry.startsWith("worktree ")) continue;
      const path = relative(directory, entry.slice(9));
      if (path && !isAbsolute(path) && path !== ".." && !path.startsWith(`..${sep}`)) {
        rules.add(literalRule(path.split(sep).join("/")));
      }
    }
  } else if (!probe.stderr.toString().includes("not a git repository")) {
    throw new Error(probe.stderr.toString().trim());
  }
  const inventory = Bun.spawnSync(["rg", "--files", "--hidden", "--null",
    ...(buildConfig(directory).gitignore === false ? ["--no-ignore"] : []), "--glob", "Cargo.toml",
    "--glob", "!**/target/**", "--glob", "!**/node_modules/**"], { cwd: directory });
  if (inventory.exitCode !== 0 && inventory.exitCode !== 1) {
    throw new Error(`Cargo manifest discovery failed: ${inventory.stderr.toString().trim()}`);
  }
  const policies: { manifest: string; rules: string[]; error?: unknown }[] = [];
  const outsideCheckout = exclusionMatcher([...rules], directory);
  for (const manifest of inventory.stdout.toString().split("\0").filter(Boolean).sort()) {
    if (outsideCheckout(manifest)) continue;
    const policy: typeof policies[number] = { manifest, rules: [] };
    policies.push(policy);
    try {
      const toml = Bun.TOML.parse(readFileSync(join(directory, manifest), "utf8"));
      const workspace = toml.workspace;
      if (workspace == null) continue;
      if (typeof workspace !== "object" || Array.isArray(workspace)) throw new Error(`invalid workspace in ${manifest}`);
      const exclusions = (workspace as Record<string, unknown>).exclude ?? [];
      if (!Array.isArray(exclusions) || exclusions.some(rule => typeof rule !== "string" || !rule || /[\r\n]/.test(rule))) {
        throw new Error(`invalid workspace.exclude in ${manifest}`);
      }
      for (const rule of exclusions as string[]) {
        if (posix.isAbsolute(rule) || /^[A-Za-z]:/.test(rule)) throw new Error(`workspace exclusion must be relative: ${rule}`);
        const path = posix.normalize(posix.join(posix.dirname(manifest), rule.replaceAll("\\", "/"))).replace(/\/$/, "");
        if (path === ".." || path.startsWith("../")) continue;
        if (path === ".") throw new Error(`workspace exclusion targets the graph root in ${manifest}`);
        policy.rules.push(`/${path}/`);
      }
    } catch (error) { policy.error = error; policy.rules = []; }
  }
  // Only enabled workspaces own exclusions. Resolve contributions together so
  // renaming a workspace cannot change the policy of its disabled neighbors.
  let active = policies;
  const seen = new Set<string>();
  while (true) {
    const key = JSON.stringify(active.map(policy => policy.manifest));
    if (seen.has(key)) throw new Error("cyclic Cargo workspace exclusions");
    seen.add(key);
    const combined = [...rules, ...active.flatMap(policy => policy.rules)];
    const excluded = exclusionMatcher(combined, directory);
    const next = policies.filter(policy => !excluded(policy.manifest));
    if (next.length === active.length && next.every((policy, i) => policy === active[i])) {
      for (const policy of active) if (policy.error) throw policy.error;
      return [...new Set(combined)].sort();
    }
    active = next;
  }
}

// Native update/watch read this generated build artifact before detect/extraction.
// Track only our derived entries so changed workspace policy can remove stale rules
// without replacing native/manual build settings.
export function syncBuildExclusions(root: string, rules: string[]): boolean {
  const directory = join(resolve(root), "graphify-out");
  const target = join(directory, ".graphify_build.json");
  const config = buildConfig(resolve(root));
  for (const key of ["excludes", "graphify_report_excludes"]) {
    if (config[key] != null && (!Array.isArray(config[key]) || (config[key] as unknown[]).some(rule => typeof rule !== "string"))) {
      throw new Error(`invalid ${key} in Graphify build config`);
    }
  }
  const previous = (config.graphify_report_excludes ?? []) as string[];
  const existing = (config.excludes ?? []) as string[];
  const manual = existing.filter(rule => !previous.includes(rule));
  const derived = rules.filter(rule => !manual.includes(rule));
  const excludes = [...manual, ...derived];
  if (JSON.stringify(excludes) === JSON.stringify(existing) && JSON.stringify(derived) === JSON.stringify(previous)) return false;
  const temporary = `${target}.tmp.${process.pid}`;
  mkdirSync(directory, { recursive: true });
  try {
    writeFileSync(temporary, JSON.stringify({ ...config, excludes, graphify_report_excludes: derived }) + "\n");
    renameSync(temporary, target);
  } finally {
    try { unlinkSync(temporary); } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }
  }
  return true;
}

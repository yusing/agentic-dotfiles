import { chmod, lstat, mkdir, readFile, readdir, symlink, writeFile } from "node:fs/promises";
import { join } from "node:path";

export const VERSION = "0.1.0";

async function main(): Promise<void> {
  if (process.argv[2] === "--version") { console.log(VERSION); return; }
  const root = "/opt/agent-tools";
  const imageHome = "/opt/agent-home";
  const mise = join(imageHome, ".local/bin/mise");
  const result = Bun.spawnSync([mise, "env", "--json"], { cwd: imageHome });
  if (result.exitCode !== 0) throw new Error("cannot resolve installed tool paths");
  const miseEnvironment = JSON.parse(result.stdout.toString());
  const directories = [join(imageHome, ".local/bin"), join(imageHome, ".grok/bin"),
    join(imageHome, ".local/opt/mosh/bin"),
    ...String(miseEnvironment.PATH).split(":").filter(path => path.startsWith(`${imageHome}/`) && !path.endsWith("/shims")),
    "/home/linuxbrew/.linuxbrew/bin", "/home/linuxbrew/.linuxbrew/sbin"];
  try { directories.push(...(await readFile(join(imageHome, ".local/share/dotfiles-setup/brew-paths"), "utf8")).trim().split("\n")); }
  catch (error) { if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error; }
  await mkdir(join(root, "bin"), { recursive: true });
  const commands = new Set<string>();
  for (const directory of new Set(directories)) {
    let names: string[];
    try { names = await readdir(directory); }
    catch (error) { if ((error as NodeJS.ErrnoException).code === "ENOENT") continue; throw error; }
    for (const name of names.sort()) {
      if (!/^[a-zA-Z0-9_][a-zA-Z0-9_.+-]*$/.test(name) || commands.has(name)) continue;
      const path = join(directory, name);
      try { if ((await lstat(path)).isDirectory()) continue; }
      catch { continue; }
      if (Bun.spawnSync(["test", "-x", path]).exitCode !== 0) continue;
      await symlink(path, join(root, "bin", name));
      commands.add(name);
    }
  }
  const plan = JSON.parse(await readFile(join(imageHome, "setup.json"), "utf8"));
  const native = [...Object.values(plan.native), ...Object.values(plan.mise.tools)
    .filter((tool: any) => tool.native?.packages?.apt?.length).map((tool: any) => tool.native)] as {
      os?: string[]; manager?: string; packages: { apt?: string[] }; commands?: string[]; optional?: boolean;
    }[];
  for (const entry of native) {
    if (entry.os && !entry.os.includes("linux")) continue;
    if (entry.manager !== "brew" && !entry.packages.apt?.length) continue;
    const declared = entry.commands ?? [];
    let exported = false;
    for (const name of declared) {
      const path = Bun.which(name, { PATH: [...directories, "/usr/bin", "/bin"].join(":") });
      if (!path) continue;
      if (!commands.has(name)) { await symlink(path, join(root, "bin", name)); commands.add(name); }
      exported = true;
    }
    if (declared.length && !exported && !entry.optional) throw new Error(`native image command missing: ${declared.join(" or ")}`);
  }
  await writeFile(join(root, "commands.json"), JSON.stringify([...commands].sort()));
  const environment = {
    ...Object.fromEntries(["GOROOT", "RUSTUP_HOME", "RUSTUP_TOOLCHAIN"].filter(name => typeof miseEnvironment[name] === "string")
      .map(name => [name, miseEnvironment[name]])),
    PATH: `${root}/bin:/home/linuxbrew/.linuxbrew/bin:/home/linuxbrew/.linuxbrew/sbin:/usr/local/bin:/usr/bin:/bin`,
    MISE_DATA_DIR: `${imageHome}/.local/share/mise`, MISE_CACHE_DIR: "/tmp/agent-tools-mise-cache",
    MISE_GLOBAL_CONFIG_FILE: `${imageHome}/.config/mise/config.toml`, MISE_AUTO_INSTALL: "0",
    MISE_TRUSTED_CONFIG_PATHS: `${imageHome}/.config/mise`,
    AGENT_TOOLS_RUNTIME: "1", HOMEBREW_PREFIX: "/home/linuxbrew/.linuxbrew", AGENT_BROWSER_ENGINE: "lightpanda",
  };
  const quote = (value: string) => `'${value.replaceAll("'", "'\\''")}'`;
  await writeFile(join(root, "enter"), `#!/bin/sh\n# version: ${VERSION}\n` +
    Object.entries(environment).map(([name, value]) => `export ${name}=${quote(value)}\n`).join("") +
    'export CARGO_HOME="${CARGO_HOME:-$HOME/.cargo}"\nexec "$@"\n', { mode: 0o755 });
  await chmod(join(root, "bin"), 0o755);
  console.error(`tool-image: finalized ${commands.size} installed commands`);
}

if (import.meta.main) await main();

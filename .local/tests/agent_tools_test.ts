import { afterEach, expect, test } from "bun:test";
import { copyFile, mkdir, mkdtemp, readFile, readdir, rm, symlink, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { filesystemArgs } from "../lib/agent-tools/agent-tools";

const binary = process.env.AGENT_TOOLS_TEST_BINARY || resolve(import.meta.dir, "../bin/agent-tools");
const image = process.env.AGENT_TOOLS_TEST_IMAGE;
const roots: string[] = [];
async function temporary() {
  const path = await mkdtemp("/var/tmp/agent-tools-test-");
  roots.push(path);
  return path;
}
afterEach(async () => { for (const path of roots.splice(0)) await rm(path, { recursive: true, force: true }); });
async function mountPaths() {
  return (await readFile("/proc/self/mountinfo", "utf8")).split("\n")
    .filter(line => line.split(" ")[4]?.startsWith("/tmp/agent-tools-"));
}

test("mount skeleton preserves image siblings, symlinks, and new host paths", async () => {
  const root = await temporary();
  await mkdir(join(root, "people/builder"), { recursive: true });
  await mkdir(join(root, "usr/bin"), { recursive: true });
  await symlink("usr/bin", join(root, "bin"));
  const args = await filesystemArgs(root, [
    { destination: "/people/another user", source: "/host/user", kind: "--bind" },
    { destination: "/projects/new", source: "/host/project", kind: "--bind" },
  ]);
  expect(args).toEqual([
    "--symlink", "usr/bin", "/bin", "--dir", "/people",
    "--bind", "/host/user", "/people/another user",
    "--ro-bind", join(root, "people/builder"), "/people/builder",
    "--dir", "/projects", "--bind", "/host/project", "/projects/new",
    "--ro-bind", join(root, "usr"), "/usr",
  ]);
  expect((await readdir(root)).sort()).toEqual(["bin", "people", "usr"]);
});

test("invalid images fail before mounting", async () => {
  const root = await temporary();
  const invalid = join(root, "invalid.sqfs");
  await writeFile(invalid, "not an image");
  const result = Bun.spawnSync([binary, "run", "--image", invalid, "--", "true"]);
  expect(result.exitCode).toBe(1);
  expect(result.stderr.toString()).toContain("IMAGE must be a SquashFS file");
});

test.skipIf(!image)("host shell startup enters once and preserves invocation arguments", async () => {
  const root = await temporary();
  const state = join(root, ".local/share/agent-tools/current");
  await mkdir(state, { recursive: true });
  await mkdir(join(root, ".local/bin"), { recursive: true });
  await symlink(binary, join(root, ".local/bin/agent-tools"));
  await symlink(image!, join(state, "tools.sqfs"));
  await symlink(Bun.which("bwrap")!, join(state, "bwrap"));
  const fuse = Bun.which("squashfuse")!;
  const mounts = join(root, "mounts");
  await writeFile(join(state, "squashfuse"), `#!/bin/sh\nprintf 'mount\\n' >> '${mounts}'\nexec '${fuse}' "$@"\n`, { mode: 0o755 });
  await symlink(binary, join(state, "agent-tools"));
  let count = 0;
  for (const [shell, executable] of [["fish", "/usr/bin/fish"], ["bash", "/bin/bash"],
    ["zsh", Bun.which("zsh") ?? "/usr/bin/zsh"]]) {
    if (!await Bun.file(executable).exists()) continue;
    const config = shell === "fish" ? ".config/fish/config.fish" : `.${shell}rc`;
    await mkdir(join(root, ".config/fish"), { recursive: true });
    await copyFile(resolve(import.meta.dir, "../..", config), join(root, config));
    if (shell === "fish") {
      await mkdir(join(root, ".config/fish/conf.d"), { recursive: true });
      await copyFile(resolve(import.meta.dir, "../../.config/fish/conf.d/00-agent-tools.fish"), join(root, ".config/fish/conf.d/00-agent-tools.fish"));
      await writeFile(join(root, ".config/fish/conf.d/10-integration.fish"), 'printf "integration-runtime=%s\\n" "$AGENT_TOOLS_RUNTIME"\ngit --version\n');
    }
    const script = shell === "fish"
      ? 'printf "runtime=%s arg=%s\\n" "$AGENT_TOOLS_RUNTIME" "$argv[1]"'
      : 'printf "runtime=%s arg=%s\\n" "$AGENT_TOOLS_RUNTIME" "$1"';
    const child = Bun.spawn([executable, "-i", "-c", script, ...(shell === "fish" ? [] : [shell]), "literal ; $(no-command)"],
      { env: { ...process.env, HOME: root, TERM: "xterm-256color", AGENT_TOOLS_RUNTIME: "", ZDOTDIR: root }, stderr: "pipe" });
    const output = await new Response(child.stdout).text();
    const error = await new Response(child.stderr).text();
    expect(await child.exited, error).toBe(0);
    expect(output).toContain("runtime=1 arg=literal ; $(no-command)");
    if (shell === "fish") expect(output.match(/integration-runtime=.*\n/g)).toEqual(["integration-runtime=1\n"]);
    expect(error).not.toContain("agent-tools:");
    expect((await readFile(mounts, "utf8")).trim().split("\n").length).toBe(++count);
  }
}, 30_000);

test.skipIf(!image)("mounted command retains UID, home, project, argv, status, and read-only runtime", async () => {
  const root = await temporary();
  const userDirectory = "/opt/agent-tools-test/user space";
  const project = "/opt/agent-tools-test/project space";
  await mkdir(join(root, "user space")); await mkdir(join(root, "project space"));
  const before = await mountPaths();
  const script = `import os,sys,pathlib
assert os.getuid() == int(sys.argv[1])
assert os.statvfs('/usr').f_flag & os.ST_RDONLY
pathlib.Path(os.environ['HOME'],'written').write_text(sys.argv[2])
pathlib.Path('written').write_text(os.getcwd())
print('runtime-ok')
sys.exit(23)`;
  // Put both paths outside the launcher's unconditional bindings, without
  // creating host directories under /opt or inside the repository.
  const child = Bun.spawn([Bun.which("bwrap")!, "--unshare-user", "--uid", "0", "--gid", "0",
    "--cap-add", "CAP_SYS_ADMIN", "--bind", "/", "/", "--dev-bind", "/dev", "/dev", "--tmpfs", "/opt",
    "--bind", root, "/opt/agent-tools-test", "--chdir", project,
    "--setenv", "HOME", userDirectory, "--", binary,
    "run", "--image", image!, "--", "/usr/bin/python3", "-c", script,
    "0", "literal ; $(not-a-command)"], { stderr: "pipe" });
  const stdout = await new Response(child.stdout).text();
  const stderr = await new Response(child.stderr).text();
  expect(await child.exited, stderr).toBe(23);
  expect(stdout).toBe("runtime-ok\n");
  expect(stderr).toBe("");
  expect(await readFile(join(root, "user space/written"), "utf8")).toBe("literal ; $(not-a-command)");
  expect(await readFile(join(root, "project space/written"), "utf8")).toBe(project);
  expect(await mountPaths()).toEqual(before);
});

test.skipIf(!image)("missing commands clean up the mounted image", async () => {
  const before = await mountPaths();
  const child = Bun.spawn([binary, "run", "--image", image!, "--", "/does-not-exist"], { stderr: "pipe" });
  const error = await new Response(child.stderr).text();
  expect(await child.exited).not.toBe(0);
  expect(error).toContain("/does-not-exist");
  expect(await mountPaths()).toEqual(before);
});

test.skipIf(!image)("cancellation reaches the command's termination handler", async () => {
  const root = await temporary();
  const marker = join(root, "terminated");
  const before = await mountPaths();
  const script = `import signal,sys,time,pathlib
def stop(sig,frame):
 pathlib.Path(sys.argv[1]).write_text('handled')
 sys.exit(0)
signal.signal(signal.SIGTERM,stop)
print('ready',flush=True)
time.sleep(30)`;
  const child = Bun.spawn([binary, "run", "--image", image!, "--", "/usr/bin/python3", "-c", script, marker], { cwd: root });
  const reader = child.stdout.getReader();
  const first = await reader.read();
  expect(new TextDecoder().decode(first.value)).toContain("ready");
  reader.releaseLock();
  child.kill("SIGTERM");
  expect(await child.exited).toBe(143);
  expect(await readFile(marker, "utf8")).toBe("handled");
  expect(await mountPaths()).toEqual(before);
});

test.skipIf(!image)("host /var/tmp files remain visible outside home and the project", async () => {
  const root = await temporary();
  const input = join(root, "input");
  await writeFile(input, "host-var-tmp");
  const child = Bun.spawn([binary, "run", "--image", image!, "--", "/bin/cat", input]);
  expect(await new Response(child.stdout).text()).toBe("host-var-tmp");
  expect(await child.exited).toBe(0);
});

test.skipIf(!image)("detached descendants keep their mounted runtime", async () => {
  const root = await temporary();
  const output = join(root, "output");
  const before = await mountPaths();
  const script = `import os,sys,time,pathlib
if os.fork(): sys.exit(0)
os.setsid()
for fd in (0,1,2): os.close(fd)
time.sleep(0.3)
try:
 result = 'ok' if pathlib.Path('/usr/bin/python3').read_bytes()[:4] == b'\\x7fELF' else 'bad image'
except Exception as exc: result = repr(exc)
pathlib.Path(sys.argv[1]).write_text(result)
os._exit(0)`;
  const child = Bun.spawn([binary, "run", "--image", image!, "--", "/usr/bin/python3", "-c", script, output], { cwd: root });
  expect(await child.exited).toBe(0);
  const deadline = Date.now() + 3000;
  while (!await Bun.file(output).exists() && Date.now() < deadline) await Bun.sleep(20);
  expect(await readFile(output, "utf8")).toBe("ok");
  expect(await mountPaths()).toEqual(before);
});

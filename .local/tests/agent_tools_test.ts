import { afterAll, afterEach, beforeAll, expect, test } from "bun:test";
import { copyFile, mkdir, mkdtemp, readFile, readdir, rm, symlink, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { realpathSync } from "node:fs";
import { filesystemArgs, planCleanup, removablePackages } from "../lib/agent-tools/agent-tools";
import { spyOn } from "bun:test";

const binary = process.env.AGENT_TOOLS_TEST_BINARY || resolve(import.meta.dir, "../bin/agent-tools");
const image = process.env.AGENT_TOOLS_TEST_IMAGE;
const roots: string[] = [];
async function temporary() {
  const path = await mkdtemp("/var/tmp/agent-tools-test-");
  roots.push(path);
  return path;
}
afterEach(async () => { for (const path of roots.splice(0)) await rm(path, { recursive: true, force: true }); });

let api: string;
let apiDirectory: string;
beforeAll(async () => {
  apiDirectory = await mkdtemp("/var/tmp/agent-tools-api-");
  const source = join(apiDirectory, "runner.ts");
  await writeFile(source, `import {runImage,processPaths,provisionLanguages} from ${JSON.stringify(resolve(import.meta.dir,"../lib/agent-tools/agent-tools.ts"))};
    const args=process.argv.slice(2);
    try {
      if(args[0]==="scan") console.log(JSON.stringify(await processPaths()));
      else if(args[0]==="languages") await provisionLanguages(args[1],false);
      else process.exitCode=await runImage(args[0],args.slice(1));
    } catch(error) {console.error(error.message);process.exitCode=1;}`);
  api = join(apiDirectory,"runner");
  const build = Bun.spawnSync([process.execPath,"build","--compile",`--outfile=${api}`,source]);
  if(build.exitCode!==0) throw new Error(build.stderr.toString());
});
afterAll(async () => { if(apiDirectory) await rm(apiDirectory,{recursive:true,force:true}); });

test.skipIf(!Bun.which("brew"))("Brew Python provisions Pyflakes and PyYAML once and retains them on rerun", async () => {
  const root=await temporary();
  const config=join(root,"setup.json");
  await writeFile(config,JSON.stringify({native:{python3:{manager:"brew",packages:{brew:["python"]}}}}));
  const env={...process.env,HOME:root,HOMEBREW_NO_AUTO_UPDATE:"1",
    HOMEBREW_CACHE:Bun.spawnSync(["brew","--cache"]).stdout.toString().trim()};
  const first=Bun.spawn([api,"languages",config],{env,stdout:"pipe",stderr:"pipe"});
  const [stdout,stderr,status]=await Promise.all([new Response(first.stdout).text(),new Response(first.stderr).text(),first.exited]);
  expect(status,stderr).toBe(0);
  expect(stdout).toContain("Successfully installed");
  const check=Bun.spawnSync([join(root,".local/opt/python/bin/python"),"-c",
    'import yaml,pyflakes; assert yaml.__version__ == "6.0.3" and pyflakes.__version__ == "4.0.3"']);
  expect(check.exitCode,check.stderr.toString()).toBe(0);
  expect(Bun.spawnSync([join(root,".local/opt/python/bin/pyflakes"),"--version"]).stdout.toString().trim().split(" ")[0]).toBe("4.0.3");
  const second=Bun.spawnSync([api,"languages",config],{env});
  expect(second.exitCode,second.stderr.toString()).toBe(0);
  expect(second.stdout.toString()).toBe("");
  expect(await readFile(join(root,".local/share/dotfiles-setup/brew-paths"),"utf8")).toBe(join(root,".local/opt/python/bin")+"\n");
},60000);

test("the consumer exposes only pull and rejects extra commands and flags", () => {
  const help = Bun.spawnSync([binary,"--help"]);
  expect(help.exitCode).toBe(0);
  expect(help.stdout.toString().split("\n")[0]).toBe("Usage: agent-tools pull");
  for(const args of [["pull","--tag","stable"],["pull","--repository","example.com/tools"],["pull","--state","/tmp/tools"],
    ["run"],["prune"],["link-hooks"],["provision"],["cleanup"]]) {
    const result=Bun.spawnSync([binary,...args]);
    expect(result.exitCode).toBe(1);
    expect(result.stderr.toString()).toContain("Usage: agent-tools pull");
  }
});

test("host cleanup removes receipt-owned replacements and preserves sources, unknown tools and active installs", async () => {
  const root = await temporary();
  const installs = join(root, ".local/share/mise/installs");
  await mkdir(installs, { recursive: true });
  await mkdir(join(root, ".local/lib/tmp-clean"), { recursive: true });
  await mkdir(join(root, ".local/bin"), { recursive: true });
  await writeFile(join(root, ".local/lib/tmp-clean/tmp_clean.ts"), "source");
  await writeFile(join(root, ".local/bin/tmp_clean"), "\x7fELFcompiled");
  await mkdir(join(root, ".local/lib/my-unmanaged-app"));
  await writeFile(join(root, ".local/lib/my-unmanaged-app/openssl.ts"), "unrelated source");
  await writeFile(join(root, ".local/bin/openssl"), "\x7fELFunrelated");
  await writeFile(join(root, ".local/bin/claude-config-helper"), "#!/bin/sh\nsource script");
  for (const name of ["encoded-real-id", "active", "unrelated", "retired", "fish"]) await mkdir(join(installs, name));
  await writeFile(join(installs, ".mise-installs.toml"), `
[encoded-real-id]
full = "aqua:example/fzf"
[active]
short = "npm:agent-browser"
[unrelated]
full = "github:user/private-tool"
[retired]
full = "aqua:bazelbuild/bazelisk"
[fish]
full = "github:fish-shell/fish-shell"
`);
  const manager = spyOn(Bun, "spawnSync").mockImplementation((argv: any) => {
    let stdout = "";
    if (argv[0].endsWith("/brew")) stdout = JSON.stringify({ formulae: [
      {name:"fzf",installed:[{runtime_dependencies:[]}]},
      {name:"git",installed:[{runtime_dependencies:[{full_name:"fzf"}]}]},
    ] });
    return {exitCode:0,stdout:Buffer.from(stdout),stderr:Buffer.from("")} as any;
  });
  try {
    const plan = await planCleanup(root, {
      config: { native: {
        fzf: {packages:{brew:["fzf"]},commands:["fzf"],legacy_mise:["aqua:example/fzf"]},
        fish: {packages:{brew:["fish"]},legacy_mise:["github:fish-shell/fish-shell"]},
        git: {packages:{brew:["git"]}},
      }, mise:{tools:{"npm:agent-browser":"latest"}}, mise_commands:{}, vendors:{}, legacy:{
        bazelisk:{retired:true,legacy_mise:["aqua:bazelbuild/bazelisk"]},
        helper:{files:[{path:".local/bin/claude-config-helper",command:"claude-config-helper"}]},
      } }, commands:["agent-browser","tmp_clean","claude-config-helper","fzf","openssl"], formulae:["fzf","git","fish"],
    }, [join(installs, "active/bin/agent-browser")]);
    expect(plan.paths).toEqual([join(root,".local/bin/tmp_clean"),join(installs,"encoded-real-id"),join(installs,"fish"),join(installs,"retired")].sort());
    expect(plan.packages.brew).toEqual([]);
    expect(plan.kept.join("\n")).toContain("active process");
    expect(plan.kept.join("\n")).toContain("retained formula");
  } finally { manager.mockRestore(); }
});

test("native cleanup retains current Brew tools and helpers while retiring exact obsolete receipts", async () => {
  const root=await temporary();
  const brew=join(root,"brew");
  const installs=join(root,".local/share/mise/installs");
  await mkdir(join(brew,"bin"),{recursive:true});
  await writeFile(join(brew,"bin/brew"),"fixture");
  await mkdir(join(root,".local/bin"),{recursive:true});
  await mkdir(join(root,".local/lib/tmp-clean"),{recursive:true});
  await writeFile(join(root,".local/lib/tmp-clean/tmp_clean.ts"),"source");
  await writeFile(join(root,".local/bin/tmp_clean"),"\x7fELFcompiled");
  await writeFile(join(root,".local/bin/fzf"),"\x7fELFold-active");
  await writeFile(join(brew,"bin/fzf"),"\x7fELFreplacement");
  for(const name of ["old-fzf","current-lightpanda","unrelated"]) await mkdir(join(installs,name),{recursive:true});
  await writeFile(join(installs,".mise-installs.toml"), '[old-fzf]\nfull="aqua:junegunn/fzf"\n[current-lightpanda]\nfull="github:lightpanda-io/browser"\n[unrelated]\nfull="github:user/custom"\n');
  await mkdir(join(root,".local/opt/go/bin"),{recursive:true});
  await writeFile(join(root,".local/opt/go/bin/go"),"\x7fELFold");
  await mkdir(join(root,".bun/install/global"),{recursive:true});
  await writeFile(join(root,".bun/install/global/package.json"),JSON.stringify({dependencies:{typescript:"1.0",unknown:"1.0"}}));
  const manager=spyOn(Bun,"spawnSync").mockImplementation((argv:any) => {
    if(!argv[0].endsWith("/brew")) throw Error("native cleanup reached a system manager");
    return {exitCode:0,stdout:Buffer.from(JSON.stringify({formulae:[{name:"fzf",installed:[{installed_as_dependency:true,installed_on_request:false,runtime_dependencies:[]}]},{name:"oldbrew",installed:[{runtime_dependencies:[{full_name:"fzf"}]}]}]})),stderr:Buffer.alloc(0)} as any;
  });
  try {
    const plan=await planCleanup(root,{nativeHost:true,brewPrefix:brew,
      config:{native:{fzf:{packages:{brew:["fzf"]},commands:["fzf"],legacy_mise:["aqua:junegunn/fzf"]}},
        mise:{tools:{"github:lightpanda-io/browser":"1.0.0"}},mise_commands:{},vendors:{},
        legacy:{fzf:{packages:{brew:["fzf"]},files:[{path:".local/bin/fzf",command:"fzf"}]},oldbrew:{retired:true,packages:{brew:["oldbrew"]}},go:{directories:[{path:".local/opt/go",executable:"bin/go"}]},tsc:{bun:"typescript"}}},
      commands:["fzf","tmp_clean","lightpanda","go","tsc"],formulae:["fzf"],replacements:{fzf:join(brew,"bin/fzf")}},[join(root,".local/bin/fzf")]);
    expect(plan.paths).toEqual([join(root,".local/opt/go"),join(installs,"old-fzf")]);
    expect(plan.bunPackages).toEqual(["typescript"]);
    expect(plan.packages).toEqual({brew:["oldbrew"],apt:[],pacman:[]});
  } finally { manager.mockRestore(); }
});

test("cleanup keeps dependencies transitively and removes an entire unused owned group", () => {
  const reverse: Record<string,string[]> = {leaf:["middle"],middle:["external"],free:[],pair:["free"]};
  expect(removablePackages(["leaf","middle","free","pair"], name => reverse[name])).toEqual(["free","pair"]);
});

test.skipIf(process.getuid!() !== 0 && Bun.spawnSync(["/usr/bin/sudo","-n","true"]).exitCode !== 0)("cleanup retains a loaded npm entrypoint reached through a relative symlink with spaces", async () => {
  const root=await temporary();
  const packageRoot=join(root,".bun/install/global/node_modules/agent-browser");
  await mkdir(packageRoot,{recursive:true});
  await writeFile(join(root,".bun/install/global/package.json"),JSON.stringify({dependencies:{"agent-browser":"1.0.0"}}));
  await writeFile(join(packageRoot,"lazy.cjs"),'module.exports="loaded";');
  await writeFile(join(packageRoot,"tool entry.cjs"), 'console.log("ready"); process.stdin.once("data",()=>{process.chdir("/");console.log("moved");process.stdin.once("data",()=>console.log(require("./lazy.cjs")));});');
  await symlink(join(packageRoot,"tool entry.cjs"),join(root,"launch tool"));
  const child=Bun.spawn([Bun.which("node")!,"./launch tool"],{cwd:root,stdin:"pipe",stdout:"pipe",stderr:"pipe"});
  const reader=child.stdout.getReader();
  try {
    expect(new TextDecoder().decode((await reader.read()).value)).toContain("ready");
    const scan=Bun.spawnSync(process.getuid!()===0 ? [api,"scan"] : ["/usr/bin/sudo","-n",api,"scan"],{timeout:90000});
    expect(scan.exitCode,scan.stderr.toString()).toBe(0);
    const paths=JSON.parse(scan.stdout.toString());
    expect(paths).toContain(join(packageRoot,"tool entry.cjs"));
    const plan=await planCleanup(root,{nativeHost:true,brewPrefix:join(root,"absent-brew"),
      config:{native:{},mise:{tools:{}},mise_commands:{},vendors:{},legacy:{"agent-browser":{bun:"agent-browser"}}},
      commands:["agent-browser"],formulae:[]},paths);
    expect(plan.bunPackages ?? []).toEqual([]);
    child.stdin.write("move\n"); child.stdin.flush();
    expect(new TextDecoder().decode((await reader.read()).value)).toContain("moved");
    const moved=Bun.spawnSync(process.getuid!()===0 ? [api,"scan"] : ["/usr/bin/sudo","-n",api,"scan"],{timeout:90000});
    expect(moved.exitCode).toBe(1);
    expect(moved.stderr.toString()).toContain(`relative interpreter entrypoint for process ${child.pid}`);
    child.stdin.write("resume\n"); child.stdin.end();
    expect(new TextDecoder().decode((await reader.read()).value)).toContain("loaded");
    expect(await child.exited).toBe(0);
  } finally { reader.releaseLock(); if(child.exitCode===null)child.kill();await child.exited; }
});

test("cleanup retains host shell plugins, requires native commands and retires logical library names", async () => {
  const root = await temporary();
  const plugins = ["zsh-autocomplete", "zsh-autosuggestions", "zsh-syntax-highlighting"];
  const manager = spyOn(Bun, "spawnSync").mockImplementation((argv: any) => {
    const formulae = [...plugins,"fzf"].map(name => ({name,installed:[]})) as any[];
    formulae.push({name:"protobuf",installed:[{runtime_dependencies:[{full_name:"owned-dep"},{full_name:"manual-dep"},{full_name:"shared-dep"}]}]},
      {name:"owned-dep",installed:[{installed_as_dependency:true,runtime_dependencies:[]}]},
      {name:"manual-dep",installed:[{installed_on_request:true,runtime_dependencies:[]}]},
      {name:"shared-dep",installed:[{installed_as_dependency:true,runtime_dependencies:[]}]},
      {name:"unrelated",installed:[{runtime_dependencies:[{full_name:"shared-dep"}]}]});
    const output = argv.some((arg: string) => arg.endsWith("/brew")) ? JSON.stringify({formulae})
      : argv[1] === "-W" ? "libprotobuf-dev|install ok installed\nowned-system-dep|install ok installed\nshared-system-dep|install ok installed\nunrelated-app|install ok installed\nnetcat-openbsd|install ok installed"
      : argv[1] === "-L" ? "/.\n/usr\n" + (argv.at(-1) === "netcat-openbsd" ? "/bin/sh" : "/usr/include/google/protobuf/message.h")
      : argv[0].endsWith("apt-mark") ? "owned-system-dep\nshared-system-dep"
      : argv[0].endsWith("apt-cache") && argv[1] === "depends" ? (argv.at(-1) === "libprotobuf-dev" ? "libprotobuf-dev\n  Depends: owned-system-dep\n  Depends: shared-system-dep" : "")
      : argv[0].endsWith("apt-cache") ? ["libprotobuf-dev","owned-system-dep","shared-system-dep"].filter(name=>argv.includes(name))
        .map(name=>`${name}\nReverse Depends:\n${name==="shared-system-dep"?"  unrelated-app\n":""}`).join("")
      : argv[0].endsWith("apt-get") ? "Remv libprotobuf-dev [1]\nRemv owned-system-dep [1]" + (argv.includes("netcat-openbsd") ? "\nRemv netcat-openbsd [1]" : "") : "";
    return {exitCode:0,stdout:Buffer.from(output),stderr:Buffer.from("")} as any;
  });
  try {
    const plan = await planCleanup(root, {config:{
      native:{...Object.fromEntries(plugins.map(name => [name,{packages:{brew:[name]}}])),
        fzf:{packages:{brew:["fzf"]},commands:["fzf"]},protobuf:{packages:{brew:["protobuf"]}},netcat:{packages:{brew:["netcat"],apt:["netcat-openbsd"]}}},
      mise:{tools:{}},mise_commands:{},vendors:{},legacy:{protobuf:{packages:{apt:["libprotobuf-dev"]}}},
    }, commands:["protoc"],formulae:[...plugins,"fzf","protobuf","netcat"]}, [realpathSync("/bin/sh"), "/", "/usr"]);
    expect(plan.packages.brew).toEqual(["owned-dep","protobuf"]);
    expect(plan.packages.apt).toEqual(["libprotobuf-dev","owned-system-dep"]);
  } finally { manager.mockRestore(); }
});

test.skipIf(process.getuid!() === 0)("cleanup refuses incomplete inspection of a non-dumpable live process", async () => {
  const root = await temporary();
  const source = join(root,"child.ts");
  await writeFile(source, `import {dlopen} from 'bun:ffi';
    const libc=dlopen('libc.so.6',{prctl:{args:['i32','u64','u64','u64','u64'],returns:'i32'}});
    if(libc.symbols.prctl(4,0,0,0,0)!==0)throw Error('prctl failed');
    console.log('ready');setTimeout(()=>{},60000);`);
  const child = Bun.spawn([process.execPath,source],{cwd:root,stdout:"pipe",stderr:"inherit"});
  const reader = child.stdout.getReader();
  try {
    expect((await reader.read()).value?.toString()).toBeDefined();
    const result = Bun.spawnSync([api,"scan"], {env:{...process.env,AGENT_TOOLS_RUNTIME:"0"}});
    expect(result.exitCode).toBe(1);
    expect(result.stderr.toString()).toContain("live process inspection is incomplete");
  } finally { reader.releaseLock();child.kill();await child.exited; }
});
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
  const result = Bun.spawnSync([api, invalid, "true"]);
  expect(result.exitCode).toBe(1);
  expect(result.stderr.toString()).toContain("IMAGE must be a SquashFS file");
});

test("shell launchers retain the host namespace and literal arguments", async () => {
  const root = await temporary();
  const state = join(root, ".local/share/agent-tools");
  await mkdir(join(state, "host-bin"), { recursive: true });
  await mkdir(join(root, "bin"));
  await symlink(binary, join(root, "bin/bash"));
  await symlink("/bin/bash", join(state, "host-bin/bash"));
  const namespace = await Bun.file("/proc/self/mountinfo").text();
  const script = 'printf "arg=%s\\n" "$1"; cat /proc/self/mountinfo';
  const child = Bun.spawn([join(root, "bin/bash"), "--noprofile", "--norc", "-c", script, "bash", "literal ; $(no-command)"],
    { env: { ...process.env, HOME: root, AGENT_TOOLS_RUNTIME: "" }, stderr: "pipe" });
  const output = await new Response(child.stdout).text();
  expect(await child.exited).toBe(0);
  expect(await new Response(child.stderr).text()).toBe("");
  expect(output).toBe(`arg=literal ; $(no-command)\n${namespace}`);
});

test("configured shells do not enter the image during startup", async () => {
  const root = await temporary();
  const state = join(root, ".local/share/agent-tools");
  await mkdir(join(state, "current"), { recursive: true });
  await mkdir(join(state, "bin"));
  await mkdir(join(root, ".local/bin"), { recursive: true });
  const refusal = '#!/bin/sh\nexit 89\n';
  await writeFile(join(state, "current/agent-tools"), refusal, { mode: 0o755 });
  await writeFile(join(root, ".local/bin/agent-tools"), refusal, { mode: 0o755 });
  // Exercise the real startup files without invoking unrelated vendor CLIs or networking.
  for (const name of ["oh-my-posh", "update-oh-my-posh-theme", "atuin", "fzf", "zoxide", "golangci-lint",
    "codex", "grok", "gh", "herdr", "shadowtree", "fastfetch"]) {
    await writeFile(join(state, "bin", name), "#!/bin/sh\nexit 0\n", { mode: 0o755 });
  }
  for (const shell of ["bash", "fish", "zsh"]) {
    const executable = Bun.which(shell);
    if (!executable) continue;
    const config = shell === "fish" ? ".config/fish/config.fish" : `.${shell}rc`;
    await mkdir(join(root, ".config/fish"), { recursive: true });
    await copyFile(resolve(import.meta.dir, "../..", config), join(root, config));
    const script = shell === "fish" ? 'printf "host-argv=%s\\n" "$argv[1]"' : 'printf "host-argv=%s\\n" "$1"';
    const child = Bun.spawn([executable, "-i", "-c", script, ...(shell === "fish" ? [] : [shell]), "literal ; $(no-command)"],
      { env: { ...process.env, HOME: root, ZDOTDIR: root, TERM: "xterm-256color", AGENT_TOOLS_RUNTIME: "" }, stderr: "pipe" });
    const output = await new Response(child.stdout).text();
    const error = await new Response(child.stderr).text();
    expect(await child.exited, error).toBe(0);
    expect(output).toContain("host-argv=literal ; $(no-command)");
  }
}, 15_000);

test("finalized runtime preserves caller commands and original script locations", async () => {
  const root = await temporary();
  for (const directory of ["image/.local/bin", "output", "caller", "release/bin"]) {
    await mkdir(join(root, directory), { recursive: true });
  }
  await writeFile(join(root, "image/setup.json"), JSON.stringify({ native: {}, mise: { tools: {} } }));
  await writeFile(join(root, "image/.local/bin/mise"), '#!/bin/sh\nprintf \'{"PATH":"/opt/agent-home/.local/bin"}\\n\'\n', { mode: 0o755 });
  await writeFile(join(root, "image/.local/bin/location-check"), '#!/bin/sh\ncat "$(dirname "$0")/support"\nprintf "%s\\n" "$1"\n', { mode: 0o755 });
  await writeFile(join(root, "image/.local/bin/support"), "original-directory\n");
  await writeFile(join(root, "caller/caller-only"), '#!/bin/sh\nprintf "caller-command\\n"\n', { mode: 0o755 });
  await copyFile(binary, join(root, "release/agent-tools"));
  await writeFile(join(root, "release/tools.sqfs"), "unused");
  await symlink("../agent-tools", join(root, "release/bin/location-check"));
  const finalizer = resolve(import.meta.dir, "../lib/tool-image/finalize.ts");
  const build = Bun.spawnSync([process.execPath, "build", "--compile", `--outfile=${join(root, "finalize")}`, finalizer]);
  expect(build.exitCode, build.stderr.toString()).toBe(0);
  const child = Bun.spawn([Bun.which("bwrap")!, "--unshare-user", "--ro-bind", "/", "/", "--dev-bind", "/dev", "/dev",
    "--proc", "/proc", "--tmpfs", "/home", "--tmpfs", "/opt", "--bind", root, root, "--chdir", root,
    "--bind", join(root, "image"), "/opt/agent-home", "--bind", join(root, "output"), "/opt/agent-tools",
    "--", "/bin/sh", "-ec", '"$1"; PATH="$2:/usr/bin:/bin" /opt/agent-tools/enter /bin/sh -ec \'location-check "$1"; caller-only; "$2" "$1"\' sh "$3" "$4"',
    "sh", join(root, "finalize"), join(root, "caller"), "literal ; $(no-command)", join(root, "release/bin/location-check")],
    { stdout: "pipe", stderr: "pipe" });
  const output = await new Response(child.stdout).text();
  const error = await new Response(child.stderr).text();
  expect(await child.exited, error).toBe(0);
  expect(output).toBe("original-directory\nliteral ; $(no-command)\ncaller-command\noriginal-directory\nliteral ; $(no-command)\n");
}, 15_000);

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
    "--setenv", "HOME", userDirectory, "--", api, image!, "/usr/bin/python3", "-c", script,
    "0", "literal ; $(not-a-command)"], { stderr: "pipe" });
  const stdout = await new Response(child.stdout).text();
  const stderr = await new Response(child.stderr).text();
  expect(await child.exited, stderr).toBe(23);
  expect(stdout).toBe("runtime-ok\n");
  expect(stderr).toBe("");
  expect(await readFile(join(root, "user space/written"), "utf8")).toBe("literal ; $(not-a-command)");
  expect(await readFile(join(root, "project space/written"), "utf8")).toBe(project);
  for (const [home, working] of [[userDirectory, "/opt"], ["/opt", project], [userDirectory, "/"]]) {
    const parent = Bun.spawn([Bun.which("bwrap")!, "--unshare-user", "--uid", "0", "--gid", "0",
      "--cap-add", "CAP_SYS_ADMIN", "--bind", "/", "/", "--dev-bind", "/dev", "/dev", "--tmpfs", "/opt",
      "--bind", root, "/opt/agent-tools-test", "--chdir", working, "--setenv", "HOME", home,
      "--", api, image!, "/bin/sh", "-ec",
      'echo must-not-run; echo lost > new-project-file'], { stderr: "pipe" });
    expect(await new Response(parent.stdout).text()).toBe("");
    expect(await parent.exited).toBe(1);
    expect(await new Response(parent.stderr).text()).toContain("overlaps image-owned files");
  }
  expect(await mountPaths()).toEqual(before);
});

test.skipIf(!image)("missing commands clean up the mounted image", async () => {
  const before = await mountPaths();
  const child = Bun.spawn([api, image!, "/does-not-exist"], { stderr: "pipe" });
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
  const child = Bun.spawn([api, image!, "/usr/bin/python3", "-c", script, marker], { cwd: root });
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
  const child = Bun.spawn([api, image!, "/bin/cat", input]);
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
  const child = Bun.spawn([api, image!, "/usr/bin/python3", "-c", script, output], { cwd: root });
  expect(await child.exited).toBe(0);
  const deadline = Date.now() + 3000;
  while (!await Bun.file(output).exists() && Date.now() < deadline) await Bun.sleep(20);
  expect(await readFile(output, "utf8")).toBe("ok");
  expect(await mountPaths()).toEqual(before);
});

import { afterAll, afterEach, beforeAll, expect, test } from "bun:test";
import { copyFile, mkdir, mkdtemp, open, readFile, readdir, readlink, rm, symlink, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { realpathSync } from "node:fs";
import { pullTools, planCleanup, removablePackages } from "../lib/agent-tools/agent-tools";
import { spyOn } from "bun:test";
import { dlopen } from "bun:ffi";

const binary = process.env.AGENT_TOOLS_TEST_BINARY || resolve(import.meta.dir, "../bin/agent-tools");
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
  await writeFile(source, `import * as fs from "node:fs/promises"; import {mock} from "bun:test";
    import {processPaths,provisionLanguages} from ${JSON.stringify(resolve(import.meta.dir,"../lib/agent-tools/agent-tools.ts"))};
    const args=process.argv.slice(2);
    try {
      if(args[0]==="scan-one") { const readDirectory=fs.readdir; mock.module("node:fs/promises",()=>({...fs,readdir:async(path,...rest)=>path==="/proc"?[args[1]]:readDirectory(path,...rest)})); console.log(JSON.stringify(await processPaths())); }
      else if(args[0]==="scan") console.log(JSON.stringify(await processPaths()));
      else if(args[0]==="languages") await provisionLanguages(args[1],false);
      else throw new Error("unsupported fixture command");
    } catch(error) {console.error(error.message);process.exitCode=1;}`);
  api = join(apiDirectory,"runner");
  const build = Bun.spawnSync([process.execPath,"build","--compile",`--outfile=${api}`,source]);
  if(build.exitCode!==0) throw new Error(build.stderr.toString());
});
afterAll(async () => { if(apiDirectory) await rm(apiDirectory,{recursive:true,force:true}); });

test("native pull upgrades through setup and retires image activation only after success", async () => {
  const root = await temporary();
  const state = join(root, ".local/share/agent-tools");
  const digest = "a".repeat(64);
  await mkdir(join(state, "releases", digest, "bin"), { recursive: true });
  await writeFile(join(state, "releases", digest, "tools.sqfs"), "old image");
  await symlink(`releases/${digest}`, join(state, "current"));
  await symlink("current/bin", join(state, "bin"));
  await writeFile(join(root, "setup.sh"), `#!/bin/bash
set -eu
test "$#" = 1 && test "$1" = --upgrade
case "$PATH" in *agent-tools/bin*|*/opt/agent-tools*) exit 98 ;; esac
printf '%s' "$1" > "$HOME/observed"
test -f "$HOME/allow-success"
`);
  const run = () => Bun.spawnSync([binary, "pull"], { env: { ...process.env, HOME: root,
    AGENT_TOOLS_RUNTIME: "", PATH: `${state}/bin:/usr/bin:/bin` }, timeout: 15000 });
  const failure = run();
  expect(failure.exitCode).not.toBe(0);
  expect(await readlink(join(state, "bin"))).toBe("current/bin");
  expect(await Bun.file(join(state, "current/tools.sqfs")).text()).toBe("old image");
  await writeFile(join(root, "allow-success"), "");
  const lease = await open(join(state, "current/tools.sqfs"), "r");
  const libc = dlopen("libc.so.6", { flock: { args: ["i32", "i32"], returns: "i32" } });
  try {
    expect(libc.symbols.flock(lease.fd, 1)).toBe(0);
    const active = run();
    expect(active.exitCode, active.stderr.toString()).toBe(0);
    expect(await Bun.file(join(state, "current/tools.sqfs")).text()).toBe("old image");
  } finally { await lease.close(); libc.close(); }
  const success = run();
  expect(success.exitCode, success.stderr.toString()).toBe(0);
  expect(await Bun.file(join(root, "observed")).text()).toBe("--upgrade");
  expect(await readdir(join(state, "releases"))).toEqual([]);
  expect(await readdir(state)).not.toContain("bin");
  expect(await readdir(state)).not.toContain("current");
});

test("native migration preserves a login shell that still depends on the image", async () => {
  const root = await temporary();
  const state = join(root, ".local/share/agent-tools");
  await mkdir(state, { recursive: true });
  await symlink("current/bin", join(state, "bin"));
  await writeFile(join(root, "setup.sh"), "fixture");
  const previous = { HOME: process.env.HOME, AGENT_TOOLS_RUNTIME: process.env.AGENT_TOOLS_RUNTIME };
  process.env.HOME = root;
  process.env.AGENT_TOOLS_RUNTIME = "";
  const installer = spyOn(Bun, "spawn").mockReturnValue({ exited: Promise.resolve(0) } as any);
  const account = spyOn(Bun, "spawnSync").mockReturnValue({exitCode:0,
    stdout:Buffer.from(`user:x:1000:1000::${root}:${state}/bin/fish\n`)} as any);
  try {
    await expect(pullTools()).rejects.toThrow("change the login shell");
    expect(await readlink(join(state, "bin"))).toBe("current/bin");
  } finally {
    installer.mockRestore(); account.mockRestore();
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key]; else process.env[key] = value;
    }
  }
});

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

test.skipIf(process.platform !== "linux")("Python option values do not block native cleanup", async () => {
  const child = Bun.spawn(["/usr/bin/python3", "-W", "ignore", "-X", "utf8", "-c", "import time; print('ready',flush=True); time.sleep(60)"], {stdout:"pipe"});
  const reader=child.stdout.getReader();
  try {
    expect(new TextDecoder().decode((await reader.read()).value)).toContain("ready");
    const result=Bun.spawnSync([api,"scan-one",String(child.pid)],{timeout:10000});
    expect(result.exitCode,result.stderr.toString()).toBe(0);
    expect(JSON.parse(result.stdout.toString())).toContain(realpathSync("/usr/bin/python3"));
  } finally {reader.releaseLock();child.kill();await child.exited;}
});

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

test.each(["linux", "macos"] as const)("native %s cleanup retains current Brew tools and helpers while retiring exact obsolete receipts", async (os) => {
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
    const plan=await planCleanup(root,{nativeOS:os,brewPrefix:brew,
      config:{native:{fzf:{os:[os],packages:{brew:["fzf"]},commands:["fzf"],legacy_mise:["aqua:junegunn/fzf"]}},
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
    const plan=await planCleanup(root,{brewPrefix:join(root,"absent-brew"),
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

test("system cleanup retires replaced libraries and keeps active files and shared dependencies", async () => {
  const root = await temporary();
  const manager = spyOn(Bun, "spawnSync").mockImplementation((argv: any) => {
    const output = argv[1] === "-W" ? "libprotobuf-dev|install ok installed\nowned-system-dep|install ok installed\nshared-system-dep|install ok installed\nunrelated-app|install ok installed\nnetcat-openbsd|install ok installed"
      : argv[1] === "-L" ? "/.\n/usr\n" + (argv.at(-1) === "netcat-openbsd" ? "/bin/sh" : "/usr/include/google/protobuf/message.h")
      : argv[0].endsWith("apt-mark") ? "owned-system-dep\nshared-system-dep"
      : argv[0].endsWith("apt-cache") && argv[1] === "depends" ? (argv.at(-1) === "libprotobuf-dev" ? "libprotobuf-dev\n  Depends: owned-system-dep\n  Depends: shared-system-dep" : "")
      : argv[0].endsWith("apt-cache") ? ["libprotobuf-dev","owned-system-dep","shared-system-dep"].filter(name=>argv.includes(name))
        .map(name=>`${name}\nReverse Depends:\n${name==="shared-system-dep"?"  unrelated-app\n":""}`).join("")
      : argv[0].endsWith("apt-get") ? "Remv libprotobuf-dev [1]\nRemv owned-system-dep [1]" + (argv.includes("netcat-openbsd") ? "\nRemv netcat-openbsd [1]" : "") : "";
    return {exitCode:0,stdout:Buffer.from(output),stderr:Buffer.from("")} as any;
  });
  try {
    const plan = await planCleanup(root, {nativeOS:"linux",brewPrefix:join(root,"absent-brew"),config:{
      native:{protobuf:{packages:{brew:["protobuf"]}},netcat:{packages:{brew:["netcat"],apt:["netcat-openbsd"]}}},
      mise:{tools:{}},mise_commands:{},vendors:{},legacy:{protobuf:{packages:{apt:["libprotobuf-dev"]}}},
    }, commands:["protoc"],formulae:["protobuf","netcat"]}, [realpathSync("/bin/sh"), "/", "/usr"]);
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


import { extname } from "node:path";
import { expandsHome, rewriteConfig } from "./rewrite-home-paths.ts";

const [mode, filename] = Bun.argv.slice(2);

if (!["clean", "smudge"].includes(mode) || !filename) {
  throw new Error("usage: git-home-filter <clean|smudge> <file>");
}

const home = mode === "clean" ? "$HOME" : process.env.HOME;
if (!home) throw new Error("HOME is not set");

const expandHome =
  mode === "smudge" &&
  expandsHome(filename);

const input = await Bun.stdin.text();

process.stdout.write(
  rewriteConfig(input, extname(filename), home, expandHome)
);

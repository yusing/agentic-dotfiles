# Changelog

## 1.1.2

Fix a false denial of in-process Bun checks carried in ANSI-C quoted Mekugi shell commands.
The shared substitution scanner no longer mistakes JavaScript template variables for
container executables; actual substitutions and subsequent container mutations remain checked.

## 1.1.1

Use command-specific log-follow option arity and wrapper-specific option values. Unwrap transparent command chains iteratively so their length cannot hide a mutation.

## 1.1.0

Allow recognized read-only Docker, Podman, nerdctl, and kubectl inspection with known options. Keep mutations, process control, and unclassified commands root-owned; route denials through the assigned result format.

## 1.0.1

Run `main` only when this process is the guard binary, so the Grok
adapter can import `responseFor` in-process.

## 1.0.0

Initial scriptc-compiled TypeScript release of the spawned-agent container command guard.

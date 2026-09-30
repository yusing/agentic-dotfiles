# Changelog

## 1.0.3

`runCommand` stdin uses POSIX `sh` so dash `/bin/sh` can exec the child
with the temp payload. scriptc `spawnSync` still has no `input` option.

## 1.0.2

`runMain` runs a hook entrypoint only when this process is that
hook's compiled binary or TypeScript source, so another binary can
import the policy without executing it.

## 1.0.1

Coerce missing child stdio to empty strings. Create the stdin payload
with mode 0600. scriptc `spawnSync` has no `input` or `cwd` option, so
the temp-file redirect and `chdir` stay.

## 1.0.0

Initial TypeScript release of stdin JSON, version, and JSON stdout helpers.

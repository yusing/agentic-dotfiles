# Changelog

## 1.0.3

Create lock files with mode 0600 using numeric fs.constants flags supported by
scriptc 0.2.6. Keep chmod to secure existing lock files too.

## 1.0.2

Recognize lock-acquisition failures by their error prefix instead of a
mutated `Error.code`, so compiled hooks can import the helper in scriptc's
static tier.

## 1.0.1

Take an exclusive `flock` on the lock file. `tryLockedDir` treats only
acquire failures as a soft miss and lets the body run once. Open the
lock two-arg, then `chmod` 0600; scriptc fences `openSync`'s mode
argument. Compiling a hook that imports this module needs
`--ffi .codex/hooks/lib/flock.ffi.json`.

## 1.0.0

Initial TypeScript release of private-directory and lock-file helpers.

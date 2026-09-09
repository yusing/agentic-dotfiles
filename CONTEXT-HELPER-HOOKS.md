# Helper and hook implementations

This file owns the implementation form of user-owned helpers and hooks. Load it
when adding, changing, compiling, versioning, or reviewing one.

Herdr-installed hooks are outside this file. Leave them as Herdr writes them.

## Allowed forms

A user-owned helper or hook is one of:

- a short, simple POSIX `sh` or bash script: no second interpreter, no JSON
  parser, no command-language detector, a few dozen lines of linear logic
- TypeScript compiled with `scriptc` or `bun build --compile` to a native
  binary; the registered command is that binary

Write TypeScript source next to a changelog. Compile before use. Register the
compiled path. Do not register Python, and do not register `bun`, `node`, or
`ts-node` on the TypeScript source.

## Hook budget

Each user-owned hook must finish its own work in under 10ms on a 2-core ARM
machine of Oracle_US class. Use `scriptc` for hooks so startup stays inside
that budget. `bun build --compile` is for helpers that have no 10ms budget.

Required calls to tools the hook exists to run (`git`, `skills-mgr`, a
guidelines binary) sit outside the 10ms budget. Do not add other work that
would miss 10ms besides those required calls.

## Versioning

Every user-owned helper and hook has a version and a changelog. Compiled
programs print the version on `--version`. Shell scripts carry a `version:`
comment at the top. The changelog records every version.

## Compile

`.local/bin/compile-agent-tools` builds missing or changed binaries for the current
machine, reusing executables when their source and build inputs are unchanged.
`setup.sh` and the Git merge/rebase hooks run it. Its short shell bootstrap builds
the compiler engine from `.local/lib/compile-agent-tools/compile-agent-tools.ts`.

Helper and hook source lives beside its changelog. The runnable form is the compiled
binary under `.codex/hooks/bin/` or `.grok/hooks/bin/` for hooks, and the helper's
path under `.local/bin/` for helpers.

`.grok/hooks/bin/adapt_codex_hook` is a user-owned hook command: it adapts
the Grok envelope and runs TypeScript Codex policy in-process so startup
stays inside the 10ms budget. Spawn remains for commands that have no
imported policy.

Host extensions the client loads as TypeScript (the OMP Codex-hook adapter)
are the client's extension format, not a helper or hook command. The hook
commands they execute still follow this file.

Tests are not helpers or hooks.

# Repository guidance

## Scope

This is an allowlist-style home-directory configuration repository. The repository
root is the home directory, but only paths re-included by `.gitignore` belong to the
repository. Ignored sibling directories, including `projects/`, are outside this
repository's scope.

There is no repository-wide build system or task runner. Each maintained subsystem
has its own configuration format or focused tests.

## Codex behavior A/B evaluation

From the repository root, rerun the stock-instruction versus configured-instruction Codex
evaluation with:

```sh
PYTHONDONTWRITEBYTECODE=1 python3 -B .codex/hooks/tests/interactive_behavior_ab.py
```

The harness runs arms A and B concurrently in separate Docker containers and runs independent
scenarios in separate concurrent Codex sessions. It reuses a prior scenario when that arm's
instructions, scenario prompts, relevant fixtures, and execution environment are unchanged; pass
`--no-scenario-cache` to force fresh sessions. Each invocation writes a timestamped persistent
result under `.codex/behavior-ab-runs/`. Read `comparison.json` there for the score summary. After
scorer-only changes, recompute an existing run without invoking Codex:

```sh
PYTHONDONTWRITEBYTECODE=1 python3 -B .codex/hooks/tests/interactive_behavior_ab.py \
  --rescore-run .codex/behavior-ab-runs/YYYYMMDD-HHMMSS
```

## Context index

Load only the contexts whose triggers match the current operation:

- Instruction surfaces: load `CONTEXT-INSTRUCTION-SURFACES.md` when locating an
  instruction owner or changing static prompts, skills, native agent roles, or
  instruction ownership. When reviewing instruction content that is already injected,
  supplied in the conversation, or available at an explicitly named path, review that
  content directly. Load the context index for a review only when the owning path is
  unknown.
- Hook architecture: load `CONTEXT-HOOK-ARCHITECTURE.md` when changing registration,
  event coverage, or the boundary between static instructions and hooks.
- Hook owners: load `CONTEXT-HOOK-OWNERS.md` when locating or changing a hook,
  shared hook infrastructure, guards, or hook state.
- Codex lifecycle: load `CONTEXT-CODEX-LIFECYCLE.md` when work crosses bootstrap,
  session, prompt, tool, first-change, or compaction events.
- Grok port: load `CONTEXT-GROK-HOOK-PORT.md` for the Grok Codex-hook adapter or
  native Grok hooks.
- OMP port: load `CONTEXT-OMP-HOOK-PORT.md` for the OMP Codex-hook extension.
- Claude port: load `CONTEXT-CLAUDE-AGENT-PORT.md` for Claude agent roles, which
  Grok also loads as its own subagent types. For any port, also load the context for
  the underlying owner being ported.
- Allowlist: load `CONTEXT-ALLOWLIST.md` before changing `.gitignore` or adding a
  tracked path.
- Imported content: load `CONTEXT-IMPORTED-CONTENT.md` when work concerns generated
  content, symlinks, submodules, imported assets, or Open File in Herdr.
- Shell configuration: load `CONTEXT-SHELL.md` before changing Fish, Zsh, or Bash
  configuration.
- Validation: load `CONTEXT-VALIDATION.md` before selecting or running checks for a
  mapped subsystem.

Treat paths and ownership relationships in the loaded context as explicit guidance.
Open those paths directly. Search beyond them only when a named path is missing, its
contents show that ownership moved, or the behavior crosses another boundary.

When writing agent-facing instructions, load the `writing-for-agents` skill.

--- project-doc ---

# Repository guidance

## Scope

This is a generated, public, read-only projection of authored agent and shell configuration.
The private source repository owns changes. The projection helper overwrites generated paths,
so do not treat edits made only in this repository as authoritative.

## Context index

- Instruction surfaces: load `CONTEXT-INSTRUCTION-SURFACES.md` when locating static prompts,
  skills, or native Codex, Claude, and Grok roles.
- Hook architecture: load `CONTEXT-HOOK-ARCHITECTURE.md` when inspecting hook registration or
  event coverage.
- Hook owners: load `CONTEXT-HOOK-OWNERS.md` when locating an included hook or shared hook
  infrastructure.
- Codex lifecycle: load `CONTEXT-CODEX-LIFECYCLE.md` when work crosses Codex lifecycle events.
- Grok port: load `CONTEXT-GROK-HOOK-PORT.md` for the Grok Codex-hook adapter.
- Claude port: load `CONTEXT-CLAUDE-AGENT-PORT.md` for Claude roles also consumed by Grok.
- Shell configuration: load `CONTEXT-SHELL.md` before changing Bash, Zsh, or Fish behavior.

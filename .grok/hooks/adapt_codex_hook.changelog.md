# Changelog

## 1.2.1

Use shell scanner 1.0.6 and subagent guard 1.1.4 for the in-process Codex policies.

## 1.2.0

Run the Go quality hook in-process, passing its action argument.
Alias Grok's `run_terminal_command` tool name to Codex's `Bash`.

## 1.1.2

Remove the retired Go-guidelines policy from the adapter.

## 1.1.1

Run the remaining Bash command guard in-process.

## 1.1.0

Run TypeScript Codex policy in-process.
Spawn remains for scripts and for hooks whose work is a required tool.
Wrap SubagentStart inventory stdout as additional context.

## 1.0.0

Initial scriptc-compiled TypeScript release of the Grok Codex-hook adapter.

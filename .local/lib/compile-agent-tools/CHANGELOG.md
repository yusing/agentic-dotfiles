# Changelog

## 1.0.33

Restore building `herdr-ai-usage` for the Herdr app status bar helper.

## 1.0.32

Build the Devin todo Work pane sync hook (`devin_work_sync`).

## 1.0.31

Stop building the retired Herdr TUI status helper.

## 1.0.30

Build one agent port generator in place of the Claude and Kilo helpers.

## 1.0.29

Build the Cargo worktree target initializer alongside disk-clean.

## 1.0.28

Track the neutral cleanup safety module for both cleaners without making either
cleaner's source a build dependency of the other.

## 1.0.27

Build and incrementally reuse the standalone graphify-report helper.

## 1.0.26

Build the Graphify post-edit update hook.

## 1.0.25

Build the registered ledger_stop_gate and capture_result_gate hooks, which
were left to manual builds.

## 1.0.24

Build agent-work-watch for the Herdr Work pane in place of the retired
herdr-work-board CLI.

## 1.0.23

Build the shared disk-clean helper alongside its temporary-cleanup dependency.
Track the shared mount guard's source when rebuilding disk-clean.

## 1.0.22

Build the project-scoped Herdr work-board CLI.

## 1.0.21

Build the Codex and Claude AI usage status helper.

## 1.0.20

Remove the retired Open File in Herdr helper from the build list.

## 1.0.19

Stop building the retired generated-file edit guard and remove it from the Grok
adapter build inputs.

## 1.0.18

Resolve compiler symlinks for build identities so setup and Git pulls reuse
unchanged helpers and hooks when PATH selects aliases of the same compiler.

## 1.0.17

Build the remote skills maintenance worker.

## 1.0.16

Build the optional private Plane helper with independently cached locked dependencies.

## 1.0.15

Build git-diffstat alongside scc-prod, tracking their shared source inputs.

## 1.0.14

Build the standalone scc-prod source-count helper.

## 1.0.13

Stop building the retired batch-agent-sessions helper.

## 1.0.12

Stop building the retired grok-explore helper.

## 1.0.11

Stop building the retired SSH image-pull helper.

## 1.0.10

Compile the shared daily Oh My Posh theme updater.

## 1.0.9

Build hooks with scriptc's LLVM-only CLI and remove generated LLVM side artifacts.

## 1.0.8

Compile the standalone tmp_clean helper.

## 1.0.7

Compile the manifest-owned batch-agent-sessions preparation and cleanup helper.

## 1.0.6

Build the dependency-free SSH image-pull helper without installing the retired X11 package.

## 1.0.5

Build the SSH image-pull helper with its locked X11 dependency on both platforms instead of the retired macOS clip-watch helper.

## 1.0.4

Compile the Go quality lifecycle hook alongside the other Codex hooks, and
rebuild the Grok adapter, with the lock FFI, when that hook changes.

## 1.0.3

Compile the clip-watch pasteboard watcher on macOS.

## 1.0.2

Compile the Kilo agent-port helper.

## 1.0.1

Remove the retired Go-guidelines hook and its adapter build dependency.

## 1.0.0

Compile only helpers and hooks whose content, compiler, flags or target changed.
Track dependency installation separately and replace successful outputs atomically.
Include scriptc's linker selection in hook build identity.

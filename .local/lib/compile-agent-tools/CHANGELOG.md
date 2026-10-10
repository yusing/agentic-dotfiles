# Changelog

## 1.0.13

Compile the native agent-tools image runtime launcher.

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

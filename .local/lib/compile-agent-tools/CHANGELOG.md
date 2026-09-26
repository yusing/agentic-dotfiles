# Changelog

## 1.0.6

Build the dependency-free clip-session without installing the retired X11 package.

## 1.0.5

Build clip-session with its locked X11 dependency on both platforms instead of the retired macOS clip-watch helper.

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

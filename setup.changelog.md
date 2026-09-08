# Changelog

## 2.2.4

Use a compiled TypeScript helper with syntax-aware JSON and TOML parsers to normalize /home, /User, and /Users home paths and agent configuration $HOME references. Merge colliding keys recursively in source order, keeping later conflicting values. Retain comments and untouched formatting when no merge is needed. Run rewriting after tools and helpers are installed.

## 2.2.3

Skip Git setup only when the home repository has a commit at HEAD, including worktrees. Continue bootstrap for empty repositories, reusing the expected origin and rejecting unrelated origins. Preserve non-empty repository configuration and state while continuing tool setup.

## 2.2.2

Disable mise Go toolchain GOBIN redirection. Validate Go-package commands in their own mise installation, reinstall missing package binaries even when a stray copy exists, and remove duplicate declared Go commands from installed Go toolchains only after validating the replacement. Preserve unrelated commands and links to the replacement.

## 2.2.1

Bypass mise's remote-version cache when resolving added or changed tools and full --upgrade runs. Keep unchanged locks on normal setup runs, and leave unrelated caches intact.

## 2.2.0

Upgrade installed native packages from the active JSON inventory on --upgrade. Target the first installed package alternative per declaration, include optional packages, and propagate upgrade failures. Keep plain setup install-only and avoid upgrading Homebrew LLVM twice. On Arch, perform a full system upgrade through yay before native installation; require a regular user account for Arch upgrades.

## 2.1.1

Manage wrk through the native package manager instead of a pinned mise source build. Remove its custom build requirement and native-package removal rule. Check package-manager status for required packages without executable probes, including failure recovery and final verification.

## 2.1.0

Use setup.json as the single package source, including mise settings and declarations. Generate mise TOML and reconcile added, changed, and removed lock entries on plain setup, preserving unchanged versions and artifacts. Keep --upgrade as the full-refresh operation and preserve the previous config/lock on resolution or validation failures.

## 2.0.1

Check the private Go proxy once with a two-second limit before Go work. Use the public proxy for the run when the private server or DNS is unavailable; retry the private server on the next run.

## 2.0.0

- Read native package mappings, probes, vendor installers, and legacy cleanup rules from `setup.json`.
- Derive mise tool membership and platform restrictions from its TOML configuration; command-name overrides are optional JSON metadata.
- Bootstrap Python TOML support when needed and respect per-tool OS restrictions during lock generation and validation.
- Support `--config` and read-only `--check-config`, with automatic config download for standalone bootstrap.
- Verify only configured packages and vendors; limit vendor installation to four concurrent jobs.

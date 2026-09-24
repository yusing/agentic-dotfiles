# Changelog

## 2.3.1

Install the packages that let agents paste images over mosh: xclip and Xvfb on Linux, where clip-recv loads images into a headless X clipboard; wl-clipboard (optional) for Wayland hosts; and pngpaste on macOS for clip-push. Tailscale is not declared, because apt needs Tailscale's own repository and macOS normally uses the app.

## 2.3.0

Accept tool names after `--upgrade`, such as `setup.sh --upgrade git-agent`. A name is a mise tool identifier from `setup.json` or its command. Setup re-resolves only those lock entries (and declarations changed in JSON), installs the lock, and confirms each named command. It skips native packages, vendors, the checkout, helper compilation, and final verification. Unknown, ambiguous, or inapplicable names stop before any lock change.

Also carry the tracked Python tool dependency graphs in `.config/mise/locks/` through lock resolution. Before this, setup resolved in a temporary tree and copied back only `mise.lock`, and mise re-resolved each missing graph against the current package index. Machines then locked different digests for the same tool version. Setup now seeds the existing graphs, keeps only the graphs the lock references, and rejects a lock whose sidecar is missing or has a different digest.

## 2.2.9

Install tailcat from Homebrew on macOS and from the tailscale/tailcat Linux release archive. A mise tool can declare that native package inline for the operating systems outside its `os` list. Setup keeps the field out of generated mise configuration, rejects a declaration that would install both sources on the same operating system, and removes a leftover mise install on macOS when the native package owns the command. eza and llvm use the same declaration. A native block can set its package name, a keg-only Homebrew prefix, and version alignment so the formula stays on the locked mise version. A mise shim for a tool that does not apply on the current operating system does not count as that Homebrew install.

## 2.2.8

Pin scriptc to 0.0.36, the last release validated with the maintained hooks. Version 0.1.2 ships its Linux x64 LLVM helper without executable permission and, after that is corrected, rejects existing shell-parser code with SC1090 errors. Keep the pin during `--upgrade` until a newer release passes `compile-agent-tools`.

## 2.2.7

Reuse validated setup configuration queries within each run instead of starting Python for every lookup. Read installed Go toolchains once during ownership cleanup, skip replacement probes for absent legacy files, and avoid duplicate mise command probes and unnecessary reshimming. Locked tool reconciliation, repair, and final verification remain enabled.

## 2.2.6

Probe Homebrew casks explicitly when checking installed packages. Recognize installed fonts during setup verification, skip reinstalling them, and include them in native upgrades.

## 2.2.5

Install Cascadia Code NF, Cascadia Mono NF, IBM Plex Sans, and JetBrainsMono Nerd Font on macOS. The tracked Kaku configuration preserves stock fonts and theme-dependent weights, adding JetBrainsMono Nerd Font Mono as a fallback. Include declared Homebrew casks alongside formulae in native upgrade detection and execution; Linux package selections are unchanged.

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

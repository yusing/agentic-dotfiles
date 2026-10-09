# Changelog

## 2.10.2

Point setup help at Mosh image paste. Setup still retires old push services
and backs up their remaining files.

## 2.10.1

Pin scriptc to 0.2.6. Run its native-CLI installer through the mise postinstall
hook, trusting only scriptc's Bun lifecycle script.

## 2.10.0

Install the stable Lightpanda 1.0.0 release through mise. Set
AGENT_BROWSER_ENGINE=lightpanda in Fish, Zsh, and Bash.

## 2.9.1

Keep login-shell authentication prompts and errors visible during both unprivileged
chsh attempts, so setup does not appear to stall while waiting for a password.

## 2.9.0

Support Homebrew-selected native packages on Linux alongside distro bootstrap
packages. Use bottled Bash, Zsh, Strace, development tools, and libraries instead
of old distro packages or shell source builds. Share selected Homebrew keg paths
with Bash, Zsh, and Fish, and expose their pkg-config metadata to vendor builds.
Retain system shells and bootstrap packages; reconcile declared Strace leftovers
only after checking the Homebrew replacement.

## 2.8.2

Show package-labeled Python dependency lock progress with elapsed updates every
30 seconds. Limit each Python tool's lock resolution to 600 seconds, configurable
with SETUP_PYTHON_LOCK_TIMEOUT, and stop mise and its descendants on timeout or
cancellation without publishing the candidate config, lock or dependency graphs.
Resolve portable Python graphs once across the selected platforms rather than
repeating the dependency resolution for Linux and macOS.

## 2.8.1

Skip locked mise installation when the requested versions are already installed,
bootstrap only missing Go/Bun runtimes, and regenerate shims only after an install,
command repair, or missing shim. Probe the Go proxy when resolving Go changes or
installing tools, rather than on every normal rerun, and share the selection across
lock resolution and installation. Keep helper compilation
content-based so unchanged binaries are reused while source and compiler changes
still rebuild them.

Skip vendor legacy mise uninstalls when no old version remains. Retire clipboard
services only when present and reload user units only after moving legacy units.

## 2.8.0

Declare the Mosh fork through the existing vendor installer and legacy-package cleanup configuration, with native source-build prerequisites. Use built-in Mosh image paste while retaining SSH image pull; keep setup free of Mosh-specific installation logic.

Stream labeled progress from all vendor installers while preserving bounded parallel installation and aggregated failures.

## 2.7.1

Use per-paste SSH image attachments without remote Xvfb. Stop installing Xvfb for clipboard forwarding; retain recoverable retirement of legacy push services and helpers.

## 2.7.0

Replace clipboard push setup with recoverable retirement of old services, LaunchAgent, and helpers. Use session-scoped SSH clipboard pull; leave shared Tailscale and linger settings unchanged.

## 2.6.0

Set the Tailscale operator on the sending host too. It was applied only on the receiver, so `clip-watch` on a Wayland desktop failed every push with `Access denied: file access denied`; `tailscale file cp` needs the operator just as `tailscale file get` does.

Also enable `clip-watch` whenever `wl-paste` is installed rather than only when `$WAYLAND_DISPLAY` is set, and start it separately. The unit is `PartOf=graphical-session.target`, so a setup run over ssh or from a tty now leaves it enabled for the next graphical session instead of skipping it.

## 2.5.0

Run the clip-watch pasteboard watcher on macOS as the `local.clip-watch` LaunchAgent. Setup writes its plist under `~/Library/LaunchAgents` and restarts it on each run so a rebuilt watcher takes over. It replaces the skhd Ctrl+V binding, whose re-sent key typed a bare `v`; setup still reloads a running skhd so the removed binding goes away. A missing watcher warns instead of stopping setup.

## 2.4.0

Configure image paste at the end of setup. The Linux host whose tailnet address matches `clip-push --target` becomes the receiver: setup makes the user the Tailscale operator and enables linger when either is missing, then enables `clip-xvfb` and `clip-recv`. A Wayland session enables `clip-watch`. macOS reloads a running skhd. A failed service step warns instead of stopping setup, and root runs or hosts without a systemd user manager skip it.

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

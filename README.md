# Agentic Dotfiles

My development setup for working with coding agents across the terminal, editor,
and shell.

It brings together shared instructions, reusable skills, specialized agent roles,
client configuration for Codex, Claude Code, and Grok, plus the shell and tool
settings that support the workflow. Use the repository as a starting point: adopt
the pieces that fit how you work and change the rest to suit your machine and
preferences.

## Highlights

- Shared working principles across Codex, Claude Code, and Grok
- Specialized explorer, support worker, reviewer, and council agent roles
- Reusable skills for planning, implementation, review, documentation, and handoff
- Hooks that keep agent behavior consistent across a coding session
- Fish as the primary shell, with shared daily behavior mirrored into Zsh
- Terminal and editor configuration for a keyboard-driven workflow
- Small local utilities for project checks and agent-assisted development

## Where to Start

| If you want to adapt… | Start with |
| --- | --- |
| The shared agent workflow | [`.codex/AGENTS.md`](.codex/AGENTS.md) |
| Codex | [`.codex/config.toml`](.codex/config.toml), [base instructions](.codex/overridden_base_instructions.md), [agents](.codex/agents/), [hook registration](.codex/hooks.json), and [hook implementations](.codex/hooks/) |
| Claude Code | [`.claude/settings.json`](.claude/settings.json), [instructions](.claude/CLAUDE.md), and [agents](.claude/agents/) |
| Grok | [`.grok/config.toml`](.grok/config.toml), [instructions](.grok/AGENTS.md), and [hooks](.grok/hooks/) |
| Reusable agent skills | [skill configuration](.skills-mgr/.skills-mgr.json) and [shared skill sources](.skills-mgr/skills/) |
| Fish | [`.config/fish/config.fish`](.config/fish/config.fish) |
| Zsh | [`.zshrc`](.zshrc) and [`.zsh/fish-mirror.zsh`](.zsh/fish-mirror.zsh) |
| Bash | [`.bashrc`](.bashrc) |
| Editors and terminal tools | [`.config/`](.config/) |
| A new machine of yours | [`setup.sh`](setup.sh) |

The `CONTEXT-*.md` files are maps for the less obvious parts of the setup. They
explain which files own agent instructions, hooks, lifecycle behavior, and shared
shell behavior.

## Image paste in remote sessions

Run setup on both computers to install the [yusing/mosh fork](https://github.com/yusing/mosh),
then connect from the computer holding the image:

```sh
mosh user@host
```

In Mekugi, press **Ctrl+^ followed by i** to attach a clipboard PNG over the
existing encrypted Mosh connection. **Ctrl+^ followed by c** cancels capture or
upload. Ordinary paste keys are unchanged. The client needs `wl-paste` on
Wayland or `xclip` on X11; macOS uses its built-in `osascript`. Both ends must
run the fork.

Images can be up to 64 MiB. Mosh shows progress, keeps typing and screen updates
responsive, and delivers one bracketed image-path paste after upload succeeds.
Mekugi recognizes that path as an attachment; other applications need equivalent
image-path attachment support. An interrupted upload resumes while the same
client and server remain alive, but does not survive restarting either process.
Incomplete files are removed on cancellation, failure, or server exit. Completed
private image files remain in remote temporary storage for pending drafts and
follow the host's normal temporary-file cleanup policy.

Setup stops the old `clip-watch`, `clip-recv`, and `clip-xvfb` services and the
macOS watcher, and moves remaining legacy launch files and helpers into
`~/.local/share/dotfiles-setup/retired-clipboard/`. It leaves Tailscale operator and
linger settings unchanged because other tools may use them.

## Install and upgrade

Review [setup.json](setup.json) before running setup. It installs tools and
configures this home checkout. Run as a regular user; setup can request sudo.
Checkout collisions are backed up under `~/.local/share/dotfiles-setup/`.
Copy selected files instead if you want to retain your own dotfiles.

```sh
bash setup.sh
```

For a new machine that should become a checkout of this repository:

```sh
curl -fsSL https://raw.githubusercontent.com/yusing/agentic-dotfiles/main/setup.sh | bash
```

| Platform | Installation | Upgrade |
| --- | --- | --- |
| Linux x86-64 / ARM64 | Pull and mount a read-only SquashFS runtime | `agent-tools pull` |
| macOS | Install the declared tools natively | `bash setup.sh --upgrade` |

### Tool sources

Both platforms use Homebrew for compatible native tools, including Go, Bun,
Node.js, Fish, LLVM, SwiftLint, Python, and rustup. Formulae follow Brew's stable
channel. Most require prebuilt bottles; mcdu uses its upstream tap's
checksummed prebuilt archives.

npm packages retain their npm source through Mise, including agent-browser and
markdownlint-cli. Bun performs npm installation. Mise also supplies tools
without a compatible current Brew source, including gh-dash and go-swagger,
plus pinned scriptc 0.2.6 and Lightpanda 1.0.0. The shells select Lightpanda as
agent-browser's default engine.

Python uses Brew's interpreter with a managed virtual environment for PyYAML
6.0.3 and Pyflakes 4.0.3. Brew rustup supplies
stable Rust and `wasm32-wasip2`. Normal native reruns retain installed Rust;
full upgrades refresh it. Linux packages these environments in the image;
macOS installs them locally. Cargo downloads and project output remain writable.

Linux uses GNU netcat and Brew Chromium/WebKitGTK 4.1 libraries. WebKitGTK 6 and
Bazelisk are excluded. macOS uses its system netcat and WebKit framework.
PostgreSQL 18 has a separate Brew data directory; setup leaves its server stopped
and does not migrate or delete existing databases. Mosh and the agent clients
use their declared vendor installers.

### Linux runtime

The consumer needs neither Docker nor image extraction nor APT/Pacman tool
selection. Raw OCI files are downloaded to `~/.local/share/agent-tools/` and the
SquashFS payload is mounted on command launch. Login shells and administration,
including sudo, stay on the host. Open a fresh terminal if you previously ran
an older whole-shell image session.

Requires a glibc host compatible with the native Bun bootstrap, curl,
`/dev/fuse`, unprivileged user namespaces, host `fusermount3` or `fusermount`, and
`/usr/bin/flock`. Host policy can block these facilities. Releases supply
Bubblewrap, Squashfuse, zsync, and a portable host Fish fallback. Keep your host
shell installed. Bootstraps older than 0.2.8 need one `bash setup.sh` migration.

```sh
agent-tools pull
```

Unchanged components are hash-verified and reused. zsync fetches missing image
blocks through a localhost authentication proxy to GHCR. Updates still read the
old image and write a complete new one, requiring space for both. Failures before activation
preserve the active runtime. A failure during automatic reconciliation leaves
the new runtime active; rerun pull to finish cleanup. Running processes retain their old image; inactive
releases are removed on every pull, including an unchanged pull. The stable
channel and architecture are selected automatically. There are no consumer tags
or alternate channels.

Managed commands preserve the user's home, project, temporary files, sockets,
and caller-added PATH entries. Image tool directories take precedence. The image
includes OpenSSH and the Docker client for an existing host daemon. Commands
inside it cannot use sudo. HOME or working directories overlapping image-owned
paths, such as `/opt`, `/usr`, or `/`, are rejected to preserve host writes.
This is a trusted runtime, not a security sandbox. Use trusted GitHub/GHCR
publishers; registry hashes verify content, not independent publisher signatures.

### Native macOS setup

Requires Homebrew and Xcode Command Line Tools. Setup installs the same tool
sources natively, compiles managed helpers, and configures the host Fish login
shell. Open a new terminal and restart GUI editors afterward.

```sh
bash setup.sh --upgrade             # all managed sources
bash setup.sh --upgrade git-agent   # only named Mise tools
```

Reruns repair missing commands while retaining installed versions. Full upgrades
refresh declared Brew, Mise, vendor, and Rust tools. Named upgrades accept a Mise
identifier or its command name and skip Brew, vendors, helpers, configuration,
and cleanup; they require a completed setup.

### Stale-tool cleanup

After replacement validation, setup and Linux pulls automatically retire
eligible old installations. Close retained active tools and rerun the same
installation or pull command to finish their retirement.

Cleanup uses declared ownership and exact Mise receipts. Linux can retire
superseded system/Brew packages and compiled helpers. macOS keeps current native
Brew packages, remaining Mise tools, and compiled helpers. Both retain host
shells and bootstrap tools, unrelated dependencies, active installations,
services, databases, and configuration data. Sudo may be needed for complete
process inspection or system package removal. Incomplete inspection blocks
cleanup; failures report unfinished work. Package-manager roots are kept; broad
autoremove is not used.

### Image publication

CI builds Linux amd64 and arm64 and refreshes tools weekly. Inventory edits need
publication before a pull sees them. A manual run with `refresh=true` refreshes
upstream versions.

Tool builds use an immutable multi-architecture prerequisite base and skip APT
bootstrap installation. Build layers use per-architecture GHCR caches; download
caches include Brew, Mise, npm, Bun, and Go. Successful cache exports retain
downloads from failed builds too; cache export or upload failures do not block a
tested release. Cache misses and upstream refreshes still require downloads. Rebuild prerequisites
with the **Linux tool image base** workflow, then update the digest in the tools,
pack, and OCI-test stages.

CI tests mounted commands, OCI/delta updates, and anonymous access before stable
promotion. GHCR packages `agentic-tools` and `agentic-tools-container` must be
public. The bootstrap is a release asset; the large image stays in GHCR.

## Adapting the Agent Setup

Start with the instruction stack before copying client settings:

- [`.codex/overridden_base_instructions.md`](.codex/overridden_base_instructions.md)
  defines the Codex harness behavior selected by [`.codex/config.toml`](.codex/config.toml).
- [`.codex/AGENTS.md`](.codex/AGENTS.md) defines the shared working principles used
  by Codex, Claude Code, and Grok.
- [`AGENTS.md`](AGENTS.md) is this checkout's repository-level agent file, not the
  shared client workflow.
- [`.codex/MAIN.md`](.codex/MAIN.md) covers coordination and delegation;
  [`.codex/REVIEW.md`](.codex/REVIEW.md) covers delivery checks and review after implementation;
  [`.codex/IMPLEMENTATION.md`](.codex/IMPLEMENTATION.md) covers implementation craft,
  [`.codex/TESTING.md`](.codex/TESTING.md) covers validation and regression evidence,
  and [`.codex/DOCS.md`](.codex/DOCS.md) covers reader-document purpose and consistency.
- [`.codex/hooks.json`](.codex/hooks.json) activates lifecycle-specific policies
  implemented under [`.codex/hooks/`](.codex/hooks/).

The agent definitions divide work by responsibility:

- **Explorers** gather source-backed facts and caller traces; they do not audit,
  recommend, or decide what should change.
- **Support workers** author bounded test suites against a settled contract and a
  compiling, stable interface, plus reader documentation, fixtures, and other support
  artifacts. Production, configuration, and dependency changes stay with main.
- **Reviewers** inspect correctness without owning the implementation.
- **Council members** provide independent judgment for genuinely ambiguous
  decisions.

Skills under [`.skills-mgr/skills/`](.skills-mgr/skills/) provide task-specific
workflows that can be shared by multiple agent clients. Begin with only the roles
and skills you need; the setup is intentionally modular.

Before using the client configurations, review their models, permissions, enabled
features, hooks, plugins, and external integrations. Some settings assume broad
filesystem and command access because they are designed for a trusted local
development environment.

## Agent Skills

[The registry](.skills-mgr/.skills-mgr.json) selects shared, Codex-only, and remote
skills. Start with the skills needed for your project; each skill owns its usage
instructions and conditions. Local sources live under
[shared skills](.skills-mgr/skills/) and [Codex skills](.codex/skills/).

The [agent-browser skill](https://github.com/vercel-labs/agent-browser) covers
browser automation. Load `agent-browser skills get core` for the installed CLI's
workflow; `agent-browser skills list` lists its specialized guides.

## Adapting the Shell Setup

Fish is the main shell configuration. Zsh loads a native port of the daily Fish
behavior, while Bash has a smaller independent setup.

Fish and Zsh use the local Oh My Posh theme at
[`.config/oh-my-posh/catppuccin_macchiato.omp.json`](.config/oh-my-posh/catppuccin_macchiato.omp.json)
so prompt initialization uses a local file. The first interactive Fish or Zsh
launch each local calendar day checks the
[upstream theme](https://github.com/JanDeDobbeleer/oh-my-posh/blob/main/themes/catppuccin_macchiato.omp.json)
in the background. Changed themes replace the local file atomically. Offline or
failed checks keep the existing theme and retry on the next day. The daily check is shared by
both shells and requires the helper installed by `compile-agent-tools`.
This theme file is managed automatically, so updates replace local edits.

On Linux, `tmp_clean --dry-run` previews stale generated Go and agent/test
artifacts in `/tmp`; `tmp_clean` permanently deletes them. Only owned recognized
directories whose contents are at least two hours old are eligible. Repositories,
recent artifacts, and paths referenced by your processes are preserved. Stop build
jobs first: process checks are a snapshot, not a lock against new activity.
Inaccessible processes are reported but cannot be checked.
The command requires the compiled helper installed by `compile-agent-tools`.

Do not replace your existing dotfiles wholesale. Compare each file with your
current configuration and merge the parts you want. In particular, check:

- commands and plugins that may not be installed on your machine;
- Homebrew and other platform-specific paths;
- terminal capabilities, key bindings, and clipboard commands;
- editor, pager, history, prompt, and completion preferences;
- environment variables and local directory assumptions.

Keeping your existing configuration beside this repository makes it easier to
adopt one layer at a time and roll back anything that does not fit.

## Terminal presets

On macOS, setup installs `font-cascadia-code-nf`, `font-cascadia-mono-nf`,
`font-ibm-plex-sans`, and `font-jetbrains-mono-nerd-font`. The tracked [Kaku configuration](.config/kaku/kaku.lua)
retains Kaku’s stock fonts and theme-dependent weights, adding JetBrainsMono Nerd
Font Mono only as an icon fallback on macOS. Linux font settings are unchanged. Only Kaku's Lua configuration is tracked, not its session or private state. Native upgrades include
declared Homebrew font casks as well as formulae.

The [WezTerm configuration](.config/wezterm/wezterm.lua) is a standalone port of
Kaku's palettes, JetBrains Mono weights, layout, cursor,
copy-on-select, and compatible Cmd shortcuts. Kaku Dark is forced regardless of
the system appearance. It uses the login shell, line height
1.1, and JetBrainsMono Nerd Font Mono as an icon fallback (also on Linux). Install
those two font families before use. The current display uses Kaku's 15-point
baseline and 26px padding, with font size divided by 1.1³ (11.27 pt), equivalent
to three Ctrl+- steps. Ctrl+0 resets to that smaller baseline. Display sizing is explicit
rather than queried during startup, because that query can hang WezTerm.
This replaces the previous Ghostty-style transparency, ligatures, and automatic
maximization. Existing windows may need Ctrl+0 to clear an earlier zoom adjustment.
Window decorations use the platform title bar and resizable frame, without Kaku's
integrated buttons or custom border. Their appearance depends on the desktop/compositor.
Kaku-specific AI/tool overlays, smart Tab/close handling, renderer color remapping,
pane gaps, session/CWD persistence, and custom tab/native UI
are not reproduced. Dark ANSI black stays dark for correct backgrounds, rather
than Kaku's special light foreground treatment. WezTerm's native close confirmation
and tab titles are used.

The [Ghostty configuration](.config/ghostty/config) uses the same forced Kaku Dark
palette, 11.27-point Medium JetBrains Mono with Nerd Font fallback, upright text,
Medium bold, font thickening enabled, disabled ligatures, opaque background, blinking
bar cursor, and copy-on-select.
Cell height is increased by 10%; 13-point side/top padding approximates WezTerm's
26px at 2x display scale. Font rasterization and DPI handling can differ between
terminals, so equal point sizes are not a pixel-perfect guarantee. Native server-side
decorations, Ghostty shortcuts, Fish/SSH integration, and unfocused command-finish
notifications remain. Ghostty retains its own tab UI, cursor blink timing, and
byte-limited scrollback rather than WezTerm's 10,000-line limit.
Reload with Ctrl+Shift+, and use Ctrl+0 to reset any manual font zoom; open a new
window for changed padding and initial dimensions. Ghostty's Ctrl+- changes the
size by one point, not WezTerm's multiplicative step.

## Repository Map

```text
.
├── setup.sh               # Bootstrap and tool installation
├── setup.json             # Package and tool declarations
├── AGENTS.md              # Repository-specific agent guidance
├── CONTEXT-*.md           # Ownership maps for instructions, hooks, and shell
├── .codex/                # Codex settings, base instructions, agents, hooks, and skills
├── .claude/               # Claude Code settings, instructions, and agents
├── .grok/                 # Grok settings and Codex-hook adapters
├── .skills-mgr/           # Skill registry and shared skill sources
├── .config/fish/          # Primary shell configuration
├── .zshrc                 # Zsh-specific configuration
├── .zsh/                  # Shared behavior ported from Fish to Zsh
├── .bashrc                # Bash-specific configuration
├── .config/               # Editors, terminal, and CLI settings
├── .local/bin/            # Small development utilities
└── .local/lib/            # Helper sources used by setup and hooks
```

## License

Licensed under the [MIT License](LICENSE). You are welcome to copy, modify, and
adapt the setup for your own workflow.

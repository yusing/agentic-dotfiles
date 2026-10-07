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
| Claude Code | [`.claude/settings.json`](.claude/settings.json) and [agents](.claude/agents/) |
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

### Mosh

Run setup on both computers to install the [yusing/mosh fork](https://github.com/yusing/mosh),
then connect from the computer holding the image:

```sh
mosh user@host
```

In Mekugi, press **Ctrl+^ followed by i** to attach a clipboard PNG over the
existing encrypted Mosh connection. **Ctrl+^ followed by c** cancels capture or
upload. Ordinary paste keys are unchanged; no `clip-session` or additional SSH
connection is needed. The client needs `wl-paste` on Wayland or `xclip` on X11;
macOS uses its built-in `osascript`. Both ends must run the fork.

Images can be up to 64 MiB. Mosh shows progress, keeps typing and screen updates
responsive, and delivers one bracketed image-path paste after upload succeeds.
Mekugi recognizes that path as an attachment; other applications need equivalent
image-path attachment support. An interrupted upload resumes while the same
client and server remain alive, but does not survive restarting either process.
Incomplete files are removed on cancellation, failure, or server exit. Completed
private image files remain in remote temporary storage for pending drafts and
follow the host's normal temporary-file cleanup policy.

### SSH and older Mosh installations

Run setup on both computers, then connect from the computer holding the image:

```sh
clip-session ssh user@host
clip-session mosh user@host
# Or launch an application directly:
clip-session ssh user@host codex
```

The source needs `pngpaste` on macOS, `wl-paste` on Wayland, or `xclip` on X11.
Both computers need the updated `clip-session`. SSH host aliases, ports, and
identities come from your SSH config. Paste connections use noninteractive SSH
key authentication, including your SSH agent, and the server must allow remote
Unix-socket forwarding (`AllowStreamLocalForwarding`). No reverse-login key,
source SSH server, remote `DISPLAY`, or Xvfb is required.

In Codex, press **Ctrl+V** to attach the image from the computer where you pressed
Paste. Copying alone transfers nothing. Each paste pulls over a new SSH connection
and becomes an image attachment, not filename text. Text paste through the terminal
is unchanged. Other applications must support attaching images from bracketed-pasted
image paths; this is not a general remote desktop clipboard.

Use the launcher rather than plain `ssh`/`mosh`. Each client's input carries its
own immutable image reference, so existing applications and simultaneous clients
do not depend on an old pane's environment or a shared clipboard. There is no
multiplexer-specific configuration. A failed paste never falls back to an old
remote image. Mosh keeps running if the auxiliary SSH connection drops; paste
again after connectivity returns and it opens a fresh connection. Ctrl+C and
Mosh's escape key remain responsive while a pull waits. Images up to 32 MiB are
supported; a paste attempt times out after 15 seconds.

Private image files remain in remote temporary storage after disconnection,
so queued input and drafts can still use them. They follow the host's normal
`/tmp` cleanup policy; do not clear them before submitting an attached draft.

Setup stops the old `clip-watch`, `clip-recv`, and `clip-xvfb` services and the
macOS watcher, and moves remaining legacy launch files and helpers into
`~/.local/share/dotfiles-setup/retired-clipboard/`. It leaves Tailscale operator and
linger settings unchanged because other tools may use them.

## Bootstrap

Setup supports macOS, Debian/Ubuntu, and Arch-based Linux. Running it may use
sudo, install packages and tools, rewrite tracked configuration paths, and
change the login shell to Fish. It can be rerun after failure. Checkout
collisions are backed up under `~/.local/share/dotfiles-setup/`. Unrelated files
are left alone.

Run setup as a regular user. Linux uses APT or Pacman/yay for bootstrap and
system prerequisites, with sudo when needed, and Homebrew/Linuxbrew for the
migrated command-line tools and development libraries. Installing Linuxbrew
as root is rejected.

Setup installs Lightpanda 1.0.0 from its GitHub release binaries through mise.
Fish, Zsh, and Bash export `AGENT_BROWSER_ENGINE=lightpanda` so agent-browser
uses it by default. Open a new shell after setup to load this setting.

For machines that should become a checkout of this repository, with its packages
and tools installed:

```sh
curl -fsSL https://raw.githubusercontent.com/yusing/agentic-dotfiles/main/setup.sh | bash
```

From an existing checkout:

```sh
bash setup.sh             # install or reconcile the locked tool set
bash setup.sh --upgrade   # upgrade setup-managed packages and tools
bash setup.sh --upgrade git-agent   # upgrade only the named mise tools
```

Naming tools after `--upgrade` re-resolves only their lock entries, plus any
declarations changed in `setup.json`, then installs the lock. Use the tool
identifier from `setup.json` or its command name. It skips native packages,
vendors, the Git checkout, helper compilation, and verification, so it needs a
completed setup. Upstream proxies may still serve a newly pushed Go commit late.

Python dependency locking reports the package being resolved and elapsed time every
30 seconds. Each Python tool has a 10-minute lock-resolution limit; a timeout stops
that resolution without replacing the existing mise configuration, lock or dependency
graphs. For a slow package index, allow more time with
`SETUP_PYTHON_LOCK_TIMEOUT=1200 bash setup.sh --upgrade` (seconds per Python tool).

When the home Git repository has a commit at `HEAD` (including worktrees), Git
setup is skipped: no identity, hooks, remote, branch, fetch, or checkout changes.
An empty repository is force-checked out to `origin/main`; an existing unrelated
origin is rejected. Tool installation and configuration still run.

Mosh uses the same vendor and legacy-package declarations as other tools in
`setup.json`. Setup installs the fork through its own installer into
`~/.local/opt/mosh`, with command links in `~/.local/bin`, then reconciles old
APT, Pacman, or Homebrew Mosh packages through the usual legacy cleanup. Packages
still needed by another installed package may be retained with a warning.
Normal reruns keep the installed fork; `--upgrade` rebuilds the current fork.
Native build prerequisites are declared in `setup.json`; macOS also needs Xcode
or its Command Line Tools. The fork installer validates its build and staged
executables before replacement, backing up previous local files under
`~/.local/share/mosh/backups/`. After a filesystem write failure, restore those
backups before retrying; replacement does not automatically roll back. Named
`--upgrade TOOL...` and `--check-config` runs do not install or update vendors.

Normal reruns retain installed native packages and skip mise tool installation
when the locked versions are already installed,
while still repairing missing commands and shims and checking the final setup.
Helper compilation is incremental on both normal runs and full `--upgrade` runs:
unchanged sources and build inputs reuse the existing executable. Named upgrades
skip helpers entirely. With this repository's `.githooks` enabled, a successful
merge or rebase (including `git pull`) runs the same incremental build, so helper
updates do not require a full setup run. Commit amendments do not trigger it.
You can also run `.local/bin/compile-agent-tools` directly after editing a helper.

Setup rewrites `/home/<user>`, `/User/<user>`, and `/Users/<user>` paths in
tracked runtime configuration to the current home, plus `$HOME` in agent
configuration. Colliding JSON and TOML keys are merged recursively; later values
win conflicts, including arrays. A compiled TypeScript helper runs after tool
installation and compilation. Files requiring a merge are reformatted, with comments
retained in a leading block; files without collisions retain their surrounding formatting.
`--upgrade` also upgrades installed native packages declared in `setup.json`,
including optional packages, through Homebrew or APT. Only declared packages are
targeted; their required dependencies may also change. On Arch, `--upgrade`
performs a **full system upgrade** with yay, including AUR packages, before
installing native packages and updating Homebrew packages. Yay uses sudo when
required.

If you already have your own dotfiles, copy the pieces you want instead of
running setup.

## Adapting the Agent Setup

Start with the instruction stack before copying client settings:

- [`.codex/overridden_base_instructions.md`](.codex/overridden_base_instructions.md)
  defines the Codex harness behavior selected by [`.codex/config.toml`](.codex/config.toml).
- [`.codex/AGENTS.md`](.codex/AGENTS.md) defines the shared working principles used
  by Codex, Claude Code, and Grok.
- [`AGENTS.md`](AGENTS.md) is this checkout's repository-level agent file, not the
  shared client workflow.
- [`.codex/MAIN.md`](.codex/MAIN.md) covers coordination and delegation;
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

The table covers skills registered in
[`.skills-mgr/.skills-mgr.json`](.skills-mgr/.skills-mgr.json). Source is Shared
for local skills under [`.skills-mgr/skills/`](.skills-mgr/skills/), Codex for
Codex-only skills under [`.codex/skills/`](.codex/skills/) or Codex plugins, and
Remote for skills installed from a JSON locator. Disabled entries are omitted.
“Model visible” means the model can select the skill itself. Conditions come
from the JSON and describe when a skill is enabled; each skill's instructions
determine when it applies.

| Name | Source | Purpose | Model visible | Condition |
| --- | --- | --- | --- | --- |
| `authoring-skill` | Shared | Author, update, review, or rename skills and maintain registration and projection | Yes | Always |
| `batch-agent-sessions` | Shared | Run parallel batch sessions with deterministic lifecycle, additive tasks, follow-ups, and integration | No | Always |
| `build-code-skeleton` | Shared | Create an initial compile-safe project skeleton | Yes | Always |
| `codebase-review` | Shared | Review the whole working tree | No | Always |
| `commit` | Shared | Write commits and fold follow-up fixes into them | Yes | Always |
| `context7-mcp` | Codex | Fetch current library documentation from Context7 | Yes | Always |
| `council` | Shared | Gather independent agent judgments | Yes | Always |
| `deliver-vertical-slice` | Shared | Deliver an approved change end to end | Yes | Always |
| `deslop` | Shared | Reduce production code while preserving behavior | No | Always |
| `dump-last-response` | Codex | Save the preceding assistant response | No | Always |
| `final-review` | Shared | Review a completed delivery independently | Yes | Always |
| `frontend-design` | Remote | Shape distinctive visual design for UI work | Yes | Always |
| `go-json-v2` | Shared | Apply Go's `encoding/json/v2` APIs | Yes | Go project |
| `go-microoptimizations` | Shared | Optimize measured Go hot paths | No | Go project |
| `golang-best-practices` | Shared | Apply version-aware Go guidance and local conventions | Yes | Go project |
| `handoff` | Shared | Prepare a handoff for another agent | No | Always |
| `herdr` | Remote | Control Herdr panes, tabs, and agent sessions | Yes | Home directory with `herdr` |
| `high-end-visual-design` | Remote | Apply high-end visual design details | Yes | TSX, JSX, HTML, or CSS project |
| `human-flavoured-writing` | Shared | Write natural, human-sounding project copy | No | Always |
| `js-ts-best-practices` | Shared | Apply JavaScript and TypeScript practices | Yes | JavaScript or TypeScript project |
| `juststore-rendering-optimizer` | Shared | Design, review, or optimize juststore React state | Yes | JavaScript or TypeScript project with `juststore` |
| `minimalist-ui` | Remote | Design clean editorial-style interfaces | Yes | TSX, JSX, HTML, or CSS project |
| `new-agent-session` | Shared | Start an agent session in a new worktree and Herdr subspace | No | Always |
| `new-project` | Shared | Run the new-project workflow | Yes | Always |
| `openai-docs` | Codex | Look up Codex and OpenAI product documentation | Yes | Always |
| `postgres-17-18-features` | Shared | Apply PostgreSQL 17 and 18 features | Yes | PostgreSQL project |
| `read-codex-session` | Codex | Inspect local Codex session transcripts | No | Always |
| `retro` | Remote | Identify workflow improvements from an agent session | No | Always |
| `rust-async-patterns` | Remote | Apply Tokio async Rust patterns | Yes | Rust project |
| `rust-best-practices` | Remote | Apply idiomatic Rust coding standards | Yes | Rust project |
| `rust-patterns` | Remote | Apply idiomatic Rust patterns | Yes | Rust project |
| `scriptc-compiler` | Shared | Read scriptc documentation | Yes | Always |
| `session-usage` | Codex | Report current Codex token usage | No | Always |
| `shadcn` | Remote | Work with shadcn/ui components | Yes | Node project with `components.json` |
| `shadowtree` | Shared | Run and author Shadowtree recipes | Yes | Always |
| `show-me` | Remote | Explain a topic with concise diagrams | Yes | Always |
| `supabase-postgres-best-practices` | Remote | Apply Supabase PostgreSQL practices | Yes | PostgreSQL project |
| `tauri-v2` | Remote | Build with Tauri v2 | Yes | Tauri v2 project |
| `teardown` | Shared | Render structured visual explanations to HTML | Yes | Always |
| `thermo-nuclear-code-quality-review` | Remote | Run a strict maintainability review | No | Always |
| `ui-ux-pro-max` | Remote | Design or review UI and UX | Yes | TSX, JSX, HTML, or CSS project |
| `use-modern-go` | Remote | Look up version-specific Go guidelines and explain individual rules | Yes | Go project |
| `user-experience` | Shared | Improve user-facing workflow behavior | Yes | Always |
| `using-pjdoc` | Shared | Validate indexed project documentation | Yes | Always |
| `vercel-react-best-practices` | Remote | Apply Vercel React practices | Yes | Node project with React |
| `vercel-react-native-skills` | Remote | Apply Vercel React Native practices | Yes | Node project with React Native |
| `visualize` | Codex | Create in-conversation visual explanations | Yes | Always |
| `web-design-guidelines` | Remote | Review UI against web interface guidelines | Yes | TSX, JSX, HTML, or CSS project |
| `writing-readme` | Shared | Write or improve repository READMEs | Yes | Always |

## Adapting the Shell Setup

Fish is the main shell configuration. Zsh loads a native port of the daily Fish
behavior, while Bash has a smaller independent setup.

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

## Repository Map

```text
.
├── setup.sh               # Bootstrap and tool installation
├── setup.json             # Package and tool declarations
├── AGENTS.md              # Repository-specific agent guidance
├── CONTEXT-*.md           # Ownership maps for instructions, hooks, and shell
├── .codex/                # Codex settings, base instructions, agents, hooks, and skills
├── .claude/               # Claude Code settings and agents
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

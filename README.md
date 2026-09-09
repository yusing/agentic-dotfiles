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
- Specialized explorer, implementer, reviewer, and council agent roles
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

## Bootstrap

Setup supports macOS, Debian/Ubuntu, and Arch-based Linux. Running it may use
sudo, install packages and tools, rewrite tracked configuration paths, and
change the login shell to Fish. It can be rerun after failure. Checkout
collisions are backed up under `~/.local/share/dotfiles-setup/`. Unrelated files
are left alone.

For machines that should become a checkout of this repository, with its packages
and tools installed:

```sh
curl -fsSL https://raw.githubusercontent.com/yusing/agentic-dotfiles/main/setup.sh | bash
```

From an existing checkout:

```sh
bash setup.sh             # install or reconcile the locked tool set
bash setup.sh --upgrade   # upgrade setup-managed packages and tools
```

When the home Git repository has a commit at `HEAD` (including worktrees), Git
setup is skipped: no identity, hooks, remote, branch, fetch, or checkout changes.
An empty repository is force-checked out to `origin/main`; an existing unrelated
origin is rejected. Tool installation and configuration still run.
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
installing native packages. Run setup as a regular user on Arch; yay uses sudo
when required.

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
- [`.codex/hooks.json`](.codex/hooks.json) activates lifecycle-specific policies
  implemented under [`.codex/hooks/`](.codex/hooks/).

The agent definitions divide work by responsibility:

- **Explorers** gather source-backed facts and caller traces; they do not audit,
  recommend, or decide what should change.
- **Implementers** make focused changes after the scope is settled.
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
| `assess-change-impact` | Shared | Map callers affected by a shared change | Yes | Always |
| `build-code-skeleton` | Shared | Create an initial compile-safe project skeleton | Yes | Always |
| `codebase-review` | Shared | Review the whole working tree | No | Always |
| `context7-mcp` | Codex | Fetch current library documentation from Context7 | Yes | Always |
| `council` | Shared | Gather independent agent judgments | Yes | Always |
| `deliver-vertical-slice` | Shared | Deliver an approved change end to end | Yes | Always |
| `deslop` | Shared | Reduce production code while preserving behavior | No | Always |
| `dump-last-response` | Codex | Save the preceding assistant response | No | Always |
| `final-review` | Shared | Review a completed delivery independently | Yes | Always |
| `frontend-design` | Remote | Shape distinctive visual design for UI work | Yes | Always |
| `go-json-v2` | Shared | Apply Go's `encoding/json/v2` APIs | Yes | Go project |
| `go-microoptimizations` | Shared | Optimize measured Go hot paths | No | Go project |
| `golang-best-practices` | Shared | Apply modern Go practices | Yes | Go project |
| `handoff` | Shared | Prepare a compact handoff for another agent | No | Always |
| `herdr` | Remote | Control Herdr panes, tabs, and agent sessions | Yes | Home directory with `herdr` |
| `high-end-visual-design` | Remote | Apply high-end visual design details | Yes | TSX, JSX, HTML, or CSS project |
| `human-flavoured-writing` | Shared | Write natural, human-sounding project copy | No | Always |
| `js-ts-best-practices` | Shared | Apply JavaScript and TypeScript practices | Yes | JavaScript or TypeScript project |
| `juststore-rendering-optimizer` | Shared | Design, review, or optimize juststore React state | Yes | JavaScript or TypeScript project with `juststore` |
| `minimalist-ui` | Remote | Design clean editorial-style interfaces | Yes | TSX, JSX, HTML, or CSS project |
| `new-project` | Shared | Run the new-project workflow | Yes | Always |
| `openai-docs` | Codex | Look up Codex and OpenAI product documentation | Yes | Always |
| `route-execution` | Shared | Select execution agents and coordinate work across owners | No | Always |
| `postgres-17-18-features` | Shared | Apply PostgreSQL 17 and 18 features | Yes | PostgreSQL project |
| `read-codex-session` | Codex | Inspect local Codex session transcripts | No | Always |
| `rust-async-patterns` | Remote | Apply Tokio async Rust patterns | Yes | Rust project |
| `rust-best-practices` | Remote | Apply idiomatic Rust coding standards | Yes | Rust project |
| `rust-patterns` | Remote | Apply idiomatic Rust patterns | Yes | Rust project |
| `scriptc-compiler` | Shared | Read scriptc documentation | Yes | Always |
| `session-usage` | Codex | Report current Codex token usage | No | Always |
| `shadcn` | Remote | Work with shadcn/ui components | Yes | Node project with `components.json` |
| `shadowtree` | Shared | Run and author Shadowtree recipes | Yes | Always |
| `show-me` | Remote | Explain a topic with concise diagrams | Yes | Always |
| `skill-creator` | Codex | Create or update a Codex skill | Yes | Always |
| `supabase-postgres-best-practices` | Remote | Apply Supabase PostgreSQL practices | Yes | PostgreSQL project |
| `tauri-v2` | Remote | Build with Tauri v2 | Yes | Tauri v2 project |
| `teardown` | Shared | Render structured visual explanations to HTML | Yes | Always |
| `thermo-nuclear-code-quality-review` | Remote | Run a strict maintainability review | No | Always |
| `ui-ux-pro-max` | Remote | Design or review UI and UX | Yes | TSX, JSX, HTML, or CSS project |
| `use-modern-go` | Remote | Apply modern Go guidelines | Yes | Go project |
| `user-experience` | Shared | Improve user-facing workflow behavior | Yes | Always |
| `using-pjdoc` | Shared | Validate indexed project documentation | Yes | Always |
| `vercel-react-best-practices` | Remote | Apply Vercel React practices | Yes | Node project with React |
| `vercel-react-native-skills` | Remote | Apply Vercel React Native practices | Yes | Node project with React Native |
| `visualize` | Codex | Create in-conversation visual explanations | Yes | Always |
| `web-design-guidelines` | Remote | Review UI against web interface guidelines | Yes | TSX, JSX, HTML, or CSS project |
| `writing-for-agents` | Remote | Write skills and agent instruction documents | Yes | Always |
| `writing-readme` | Shared | Write or improve repository READMEs | Yes | Always |

## Adapting the Shell Setup

Fish is the main shell configuration. Zsh loads a native port of the daily Fish
behavior, while Bash has a smaller independent setup.

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

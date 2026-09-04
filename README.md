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
| Grok | [`.grok/config.toml`](.grok/config.toml) and [hooks](.grok/hooks/) |
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

`setup.sh` is for machines that should become a checkout of this repository.
It installs OS packages, checks this repository out into `$HOME`, rewrites the
repository's canonical home paths in tracked runtime configuration for the local
machine, and installs the locked cross-platform tool set through `mise`. Native
package managers retain ownership of system foundations; `mise` owns development
runtimes and fast-moving command-line tools; vendor installers retain ownership
of Claude Code, Grok, and herdr.

When `$HOME` is already the recognized private `yusing/dotfiles` checkout,
setup preserves its origin and history and continues with the remaining setup
instead of replacing it with the public projection.

Setup configures this checkout to use [`.githooks/`](.githooks/). After each
commit, the post-commit hook refreshes `projects/public-agent-shell-config` and,
when projected content changed, creates a local commit there with the same
commit message. It does not push the public repository.

It is written for a home directory that already has unrelated files, and it
can be run again if it stops partway through. Files that would be overwritten
by the checkout are copied to `~/.local/share/dotfiles-setup/` first. Untracked
files this repository does not own are left in place. A normal rerun reconciles
every managed tool to the tracked lock without querying remote version APIs.
Go is installed first so the source-built Go tools use the locked toolchain.
After every replacement validates, it removes explicitly mapped
duplicate Brew, APT, and Pacman packages in one package-manager transaction,
then removes legacy direct-install copies. It refuses an APT removal that would
remove another package, and package-manager dependency failures leave the legacy
copy in place.

```sh
curl -fsSL https://raw.githubusercontent.com/yusing/agentic-dotfiles/main/setup.sh | bash
```

If you already have the file:

```sh
bash setup.sh
```

To advance the tracked lock to the latest eligible releases and install that
tool set on the current machine:

```sh
bash setup.sh --upgrade
```

The lock covers Linux on arm64 and x86-64, plus macOS on arm64. Releases
normally must be at least three days old; backends that cannot apply that policy
reliably use an explicit per-tool exception. `--upgrade` does not perform a
native OS package upgrade. Lock updates use an existing GitHub CLI login when
available, validate every release artifact, and replace the tracked lock only
after the complete candidate passes. This lock refresh is the only setup path
that queries remote version APIs.

If you are adapting pieces of this setup on a machine that already has its own
dotfiles, do not run `setup.sh`. Copy the files you want instead.

## Adapting the Agent Setup

Start with the instruction stack before copying client settings:

- [`.codex/overridden_base_instructions.md`](.codex/overridden_base_instructions.md)
  defines the Codex harness behavior selected by [`.codex/config.toml`](.codex/config.toml).
- [`.codex/AGENTS.md`](.codex/AGENTS.md) defines the shared working principles used
  by Codex, Claude Code, and Grok.
- [`AGENTS.md`](AGENTS.md) contains guidance specific to this repository.
- [`.codex/hooks.json`](.codex/hooks.json) activates lifecycle-specific policies
  implemented under [`.codex/hooks/`](.codex/hooks/).

The agent definitions divide work by responsibility:

- **Explorers** investigate ownership, behavior, and change impact.
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

The table covers local shared skills under [`.skills-mgr/skills/`](.skills-mgr/skills/)
and Codex-only skills directly under [`.codex/skills/`](.codex/skills/). “Model
visible” means the model can select the skill itself. Conditions come from
[`.skills-mgr/.skills-mgr.json`](.skills-mgr/.skills-mgr.json) and describe when a
skill is enabled; each skill's instructions determine when it applies.

| Name | Purpose | Model visible | Condition |
| --- | --- | --- | --- |
| `assess-change-impact` | Map callers affected by a shared change | Yes | Always |
| `build-code-skeleton` | Create an initial compile-safe project skeleton | Yes | Always |
| `codebase-review` | Review the whole working tree | No | Always |
| `council` | Gather independent agent judgments | Yes | Always |
| `deliver-vertical-slice` | Deliver an approved change end to end | Yes | Always |
| `deslop` | Reduce production code while preserving behavior | No | Always |
| `dump-last-response` | Save the preceding assistant response | No | Always |
| `final-review` | Review a completed delivery independently | Yes | Always |
| `go-json-v2` | Apply Go's `encoding/json/v2` APIs | Yes | Go project |
| `go-microoptimizations` | Optimize measured Go hot paths | No | Go project |
| `golang-best-practices` | Apply modern Go practices | Yes | Go project |
| `handoff` | Prepare a compact handoff for another agent | No | Always |
| `human-flavoured-writing` | Write natural, human-sounding project copy | No | Always |
| `js-ts-best-practices` | Apply JavaScript and TypeScript practices | Yes | JavaScript or TypeScript project |
| `juststore-rendering-optimizer` | Reduce React rerenders with juststore | Yes | JavaScript or TypeScript project with `juststore` |
| `new-project` | Run the new-project workflow | Yes | Always |
| `orchestrated-workflow` | Coordinate a change through Codex agents | No | Always |
| `postgres-17-18-features` | Apply PostgreSQL 17 and 18 features | Yes | PostgreSQL project |
| `read-codex-session` | Inspect local Codex session transcripts | No | Always |
| `session-usage` | Report current Codex token usage | No | Always |
| `shadowtree` | Run and author Shadowtree recipes | Yes | Always |
| `user-experience` | Improve user-facing workflow behavior | Yes | Always |
| `using-pjdoc` | Validate indexed project documentation | Yes | Always |
| `writing-readme` | Write or improve repository READMEs | Yes | Always |

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
├── AGENTS.md              # Repository-specific agent guidance
├── .codex/                # Codex settings, base instructions, agents, hooks, and skills
├── .claude/               # Claude Code settings and agents
├── .grok/                 # Grok settings and Codex-hook adapters
├── .skills-mgr/skills/    # Reusable cross-client skills
├── .config/fish/          # Primary shell configuration
├── .zshrc                 # Zsh-specific configuration
├── .zsh/                  # Shared behavior ported from Fish to Zsh
├── .bashrc                # Bash-specific configuration
├── .config/               # Selected editor, terminal, and CLI settings
└── .local/bin/            # Small development utilities
```

## License

Licensed under the [MIT License](LICENSE). You are welcome to copy, modify, and
adapt the setup for your own workflow.

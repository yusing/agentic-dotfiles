# Shell ownership

- `.config/fish/config.fish` is the main Fish configuration.
- `.config/fish/conf.d/`, `.config/fish/functions/`,
  `.config/fish/completions/`, and `.config/fish/scripts/` own their corresponding
  Fish startup fragments, autoloaded functions, completions, and support scripts.
- `.zsh/fish-mirror.zsh` is the Zsh port of shared daily Fish behavior. Shared
  behavior should remain semantically aligned while using native syntax for each
  shell.
- `.zshrc` owns Zsh-only completion, plugin, widget, key-binding, and mirror-loading
  setup.
- `.bash_profile` makes local binaries and Mise shims available to login Bash,
  including Codex commands. `.bashrc` is independent Bash-specific interactive
  setup and is not a complete Fish mirror.
- `.config/fish/config.fish` and `.zsh/fish-mirror.zsh` export `CLAUDE_CODE_SHELL` as
  `which bash`, after their `PATH` setup, so Claude Code's Bash tool runs that bash instead
  of falling back to zsh. Claude Code snapshots `.bashrc` for that shell at startup, so
  `.bashrc` changes reach the tool after a restart.

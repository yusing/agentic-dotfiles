for brew_bin in /opt/homebrew/bin/brew /usr/local/bin/brew /home/linuxbrew/.linuxbrew/bin/brew; do
  if [ -x "$brew_bin" ]; then
    eval "$("$brew_bin" shellenv)"
    break
  fi
done
unset brew_bin

export AGENT_BROWSER_ENGINE=lightpanda

export PATH="$HOME/.local/share/mise/shims:$HOME/.local/bin:$PATH"
if [ -r "$HOME/.local/share/dotfiles-setup/brew-paths" ]; then
  while IFS= read -r brew_path; do
    [ ! -d "$brew_path" ] || export PATH="$brew_path:$PATH"
  done <"$HOME/.local/share/dotfiles-setup/brew-paths"
fi
unset brew_bin brew_path

if [ "${AGENT_TOOLS_RUNTIME:-0}" = 1 ]; then
  export PATH="/opt/agent-tools/bin:$PATH"
elif [ -d "$HOME/.local/share/agent-tools/bin" ]; then
  export PATH="$HOME/.local/share/agent-tools/bin:$PATH"
fi

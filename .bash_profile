for brew_bin in /opt/homebrew/bin/brew /usr/local/bin/brew /home/linuxbrew/.linuxbrew/bin/brew; do
  if [ -x "$brew_bin" ]; then
    eval "$("$brew_bin" shellenv bash)"
    break
  fi
done
unset brew_bin

export AGENT_BROWSER_ENGINE=chrome

export PATH="$HOME/.local/share/mise/shims:$HOME/go/bin:$HOME/.bun/bin:$PATH"
if [ -r "$HOME/.local/share/dotfiles-setup/brew-paths" ]; then
  while IFS= read -r brew_path; do
    [ ! -d "$brew_path" ] || export PATH="$brew_path:$PATH"
  done <"$HOME/.local/share/dotfiles-setup/brew-paths"
fi
unset brew_bin brew_path

# Keep the Cargo launcher ahead of Homebrew's rustup proxies.
export PATH="$HOME/.local/bin:$PATH"
case ":$PATH:" in
  *":$HOME/.cargo/bin:"*) ;;
  *) export PATH="$PATH:$HOME/.cargo/bin" ;;
esac

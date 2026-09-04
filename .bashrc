if [ -f /opt/homebrew/bin/brew ]; then
  eval $(/opt/homebrew/bin/brew shellenv bash)
fi

export PATH="$HOME/.local/bin:$HOME/go/bin:$HOME/.bun/bin:$PATH"
command -v mise >/dev/null 2>&1 && eval "$(mise activate bash)"


export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"  # This loads nvm
[ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion"  # This loads nvm bash_completion

command -v shadowtree >/dev/null 2>&1 && eval "$(shadowtree completion bash)"

eval "$(oh-my-posh init bash --config catppuccin_macchiato)"

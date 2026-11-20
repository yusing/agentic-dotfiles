# macOS /etc/zprofile runs path_helper after ~/.zshenv, moving system paths ahead
# of user and Homebrew entries. Re-apply ~/.zshenv to restore precedence.
[[ -r "$HOME/.zshenv" ]] && source "$HOME/.zshenv"

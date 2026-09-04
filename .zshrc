export PATH="$HOME/.local/bin:$HOME/go/bin:$HOME/.bun/bin:$PATH"
command -v mise >/dev/null 2>&1 && eval "$(mise activate zsh)"

zmodload zsh/complist
autoload -Uz compinit && compinit

zstyle ':completion:*' matcher-list \
    'm:{a-zA-Z}={A-Za-z} l:|=* r:|=*'
setopt GLOB_DOTS

zstyle ':completion:*' list-colors "${(s.:.)LS_COLORS}" '=(#b)(*)[[:space:]]##(-- *)=0=0=38;5;244'
zstyle ':completion:*:*:*:*:descriptions' format '%F{blue}%B-- %d --%b%f'
zstyle ':completion:*' menu select=1
zstyle ':completion:*' verbose yes

export PATH=$HOME/bin:/usr/local/bin:$PATH
[[ -r "$HOME/.zsh/fish-mirror.zsh" ]] && source "$HOME/.zsh/fish-mirror.zsh"

ZSH_AUTOSUGGEST_STRATEGY=(history completion)

[[ -r /usr/share/zsh/plugins/zsh-syntax-highlighting/zsh-syntax-highlighting.zsh ]] \
    && source /usr/share/zsh/plugins/zsh-syntax-highlighting/zsh-syntax-highlighting.zsh
[[ -r /usr/share/zsh/plugins/zsh-autosuggestions/zsh-autosuggestions.zsh ]] \
    && source /usr/share/zsh/plugins/zsh-autosuggestions/zsh-autosuggestions.zsh
[[ -r /usr/share/zsh/plugins/zsh-autocomplete/zsh-autocomplete.plugin.zsh ]] \
    && source /usr/share/zsh/plugins/zsh-autocomplete/zsh-autocomplete.plugin.zsh

zle -C expand-alias complete-word _expand_alias
expand-alias-space() {
    local -a words
    words=(${(z)LBUFFER})
    case "${words[-1]-}" in
        ls|la|ll|lt|l.) ;;
        *) zle expand-alias ;;
    esac
    zle self-insert
}
zle -N expand-alias-space
bindkey -M emacs ' ' expand-alias-space
bindkey -M viins ' ' expand-alias-space

if (( $+widgets[atuin-search] )); then
    bindkey -M emacs '^r' atuin-search
    bindkey -M viins '^r' atuin-search-viins
    bindkey -M vicmd '/' atuin-search
fi
if (( $+widgets[atuin-up-search] )); then
    bindkey -M emacs '^[[A' atuin-up-search
    bindkey -M emacs '^[OA' atuin-up-search
    bindkey -M viins '^[[A' atuin-up-search-viins
    bindkey -M viins '^[OA' atuin-up-search-viins
    bindkey -M vicmd '^[[A' atuin-up-search-vicmd
    bindkey -M vicmd '^[OA' atuin-up-search-vicmd
fi

bindkey '^[[B' menu-select
bindkey '^[OB' menu-select
bindkey -M menuselect '\e[A' up-line-or-history
bindkey -M menuselect '\e[B' down-line-or-history

bindkey '^[[1;5C' forward-word

bindkey '^I' menu-select
bindkey -M menuselect '^I' menu-complete


clipboard_copy() {
    local input
    # Read from stdin if piped, otherwise take arguments
    if [[ -p /dev/stdin ]]; then
        input=$(cat)
    else
        input="$*"
    fi

    # 1. Try native platform tools first
    if type pbcopy >/dev/null 2>&1; then
        printf '%s' "$input" | pbcopy
    elif [[ -n "$WAYLAND_DISPLAY" ]] && type wl-copy >/dev/null 2>&1; then
        # Wrapped in a subshell to suppress Zsh job/PID notifications
        (printf '%s' "$input" | wl-copy &)
    elif [[ -n "$DISPLAY" ]] && type xclip >/dev/null 2>&1; then
        printf '%s' "$input" | xclip -selection clipboard >/dev/null 2>&1
    elif [[ -n "$DISPLAY" ]] && type xsel >/dev/null 2>&1; then
        printf '%s' "$input" | xsel --clipboard >/dev/null 2>&1
    elif type clip.exe >/dev/null 2>&1; then
        printf '%s' "$input" | clip.exe >/dev/null 2>&1
    else
        # 2. Zero-dependency Fallback: OSC 52 Escape Sequence
        # Redirected to /dev/tty so it doesn't pollute stdout
        if type base64 >/dev/null 2>&1; then
            local encoded
            encoded=$(printf '%s' "$input" | base64 | tr -d '\n\r')
            if [[ -c /dev/tty ]]; then
                printf '\e]52;c;%s\a' "$encoded" > /dev/tty
            else
                echo "zsh_clipboard_copy: No system clipboard tool found and no TTY available for OSC 52 fallback." >&2
                return 1
            fi
        else
            echo "zsh_clipboard_copy: No system clipboard tool or base64 utility found." >&2
            return 1
        fi
    fi
}

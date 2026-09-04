# Active Fish config mirror for Zsh.
# Keep bulky legacy generators in Fish; this file mirrors daily shell setup.

typeset -U path PATH

_zfm_command_exists() {
    command -v -- "$1" >/dev/null 2>&1
}

_zfm_path_prepend() {
    local dir=${~1}
    [[ -d "$dir" ]] || return 1
    path=("$dir" ${path:#$dir})
}

if [[ -o interactive ]]; then
    echo-error() {
        print -ru2 -- "$*"
    }
else
    echo-error() {
        return 1
    }
fi

check-command() {
    if ! _zfm_command_exists "$1"; then
        echo-error "$1 is not installed or not in PATH"
        return 1
    fi
}

check-path() {
    if [[ ! -d "$1" ]]; then
        echo-error "$1 is not a directory"
        return 1
    fi
}

check-file() {
    if [[ ! -f "$1" ]]; then
        echo-error "$1 is not a file"
        return 1
    fi
}

if [[ -x /opt/homebrew/bin/brew ]]; then
    eval "$(/opt/homebrew/bin/brew shellenv)"
fi

export OPENSPEC_TELEMETRY=0
export DO_NOT_TRACK=1
export DISABLE_TELEMETRY=1
export OMO_DISABLE_POSTHOG=1
export NODE_OPTIONS='--max-old-space-size=8192'

export HOMEBREW_AUTO_UPDATE_SECS=86400
export CLAUDE_PACKAGE_MANAGER=bun

if _zfm_command_exists toe && _zfm_command_exists tput; then
    _zfm_term_program=${${TERM_PROGRAM:-}:l}
    _zfm_term_family=

    if [[ ${HERDR_ENV:-} == 1 ]]; then
        if [[ -z ${TERM+x} || $TERM == xterm || $TERM == xterm-256color ]]; then
            _zfm_term_family=ghostty
        fi
    elif [[ -z ${TERM+x} ]]; then
        if [[ -n ${GHOSTTY_RESOURCES_DIR+x} || $_zfm_term_program == *ghostty* ]]; then
            _zfm_term_family=ghostty
        elif [[ -n ${ALACRITTY_WINDOW_ID+x} || -n ${ALACRITTY_SOCKET+x} \
                || $_zfm_term_program == *alacritty* ]]; then
            _zfm_term_family=alacritty
        elif [[ $_zfm_term_program == *kaku* ]]; then
            _zfm_term_family=kaku
        elif [[ $_zfm_term_program == *xtermjs* || $_zfm_term_program == *xterm.js* \
                || $_zfm_term_program == *vscode* ]]; then
            _zfm_term_family=xterm
        fi
    fi

    if [[ -n $_zfm_term_family ]]; then
        _zfm_best_term=
        _zfm_best_colors=-1
        while read -r _zfm_term _; do
            case $_zfm_term_family in
                ghostty)
                    [[ $_zfm_term == ghostty || $_zfm_term == xterm-ghostty ]] || continue
                    ;;
                alacritty)
                    [[ $_zfm_term == alacritty || $_zfm_term == alacritty-* ]] || continue
                    ;;
                kaku)
                    [[ $_zfm_term == kaku || $_zfm_term == kaku-* ]] || continue
                    ;;
                xterm)
                    [[ $_zfm_term == xterm || $_zfm_term == xterm-* ]] || continue
                    ;;
            esac

            _zfm_colors=$(tput -T "$_zfm_term" colors 2>/dev/null)
            [[ $_zfm_colors == <-> ]] || continue
            if (( _zfm_colors > _zfm_best_colors )); then
                _zfm_best_term=$_zfm_term
                _zfm_best_colors=$_zfm_colors
            elif (( _zfm_colors == _zfm_best_colors )) \
                    && { [[ $_zfm_term_family == ghostty && $_zfm_term == xterm-ghostty ]] \
                    || { [[ $_zfm_term_family != ghostty ]] \
                    && (( ${#_zfm_term} < ${#_zfm_best_term} )); }; }; then
                _zfm_best_term=$_zfm_term
                _zfm_best_colors=$_zfm_colors
            fi
        done < <(toe -a 2>/dev/null)

        [[ -n $_zfm_best_term ]] && export TERM=$_zfm_best_term
    fi

    unset _zfm_term_program _zfm_term_family _zfm_best_term _zfm_best_colors \
        _zfm_term _zfm_colors
fi

if [[ -z ${COLORTERM+x} && -n ${TERM+x} ]] && _zfm_command_exists tput; then
    _zfm_colors=$(tput colors 2>/dev/null)
    if { [[ $_zfm_colors == <-> ]] && (( _zfm_colors >= 16777216 )) } \
            || tput RGB >/dev/null 2>&1 || tput Tc >/dev/null 2>&1; then
        export COLORTERM=truecolor
    fi
    unset _zfm_colors
fi

_zfm_path_prepend "$HOME/.local/bin"
check-path "$HOME/go/bin" && _zfm_path_prepend "$HOME/go/bin"

if ! _zfm_command_exists go; then
    echo-error "go is not installed or not in PATH"
fi

if [[ -z ${GOPATH:-} ]]; then
    if _zfm_command_exists go; then
        gopath_from_go=$(go env GOPATH 2>/dev/null)
    fi
    if [[ -n "$gopath_from_go" ]]; then
        export GOPATH="$gopath_from_go"
    elif [[ -d "$HOME/.local/go" ]]; then
        export GOPATH="$HOME/.local/go"
    elif [[ -d "$HOME/go" ]]; then
        export GOPATH="$HOME/go"
    else
        echo-error "GOPATH is not set and neither is ~/.local/go"
    fi
    unset gopath_from_go
fi

if _zfm_command_exists docker && [[ -z ${DOCKER_HOST:-} ]]; then
    if [[ -S "$HOME/.docker/run/docker.sock" ]]; then
        export DOCKER_HOST="unix://$HOME/.docker/run/docker.sock"
    else
        export DOCKER_HOST="unix:///var/run/docker.sock"
    fi
fi


_zfm_command_exists delta && export PAGER=delta

export GPG_TTY="$(tty)"
export TTY="$(tty)"

if _zfm_command_exists micro; then
    export EDITOR=micro
else
    export EDITOR=nano
fi
export EDITOR_INTERACTIVE="$EDITOR"

alias st='shadowtree'

check-command make
check-command just
check-command shadowtree

make() {
    if [[ -f .shadowtree.toml ]]; then
        command shadowtree "$@"
    elif [[ -f Makefile ]]; then
        command make "$@"
    elif [[ -f Justfile ]]; then
        command just "$@"
    else
        echo-error "No Makefile or Justfile found."
        return 1
    fi
}

if [[ -o interactive ]]; then
    _zfm_command_exists oh-my-posh && eval "$(oh-my-posh init zsh --config catppuccin_macchiato)"
    _zfm_command_exists atuin && eval "$(atuin init zsh)"
    _zfm_command_exists fzf && eval "$(fzf --zsh 2>/dev/null)" 2>/dev/null
    _zfm_command_exists zoxide && eval "$(zoxide init zsh)"
    _zfm_command_exists codex && eval "$(codex completion zsh)"
    _zfm_command_exists grok && eval "$(grok completions zsh)"
    _zfm_command_exists gh && eval "$(gh completion --shell zsh)"
    _zfm_command_exists shadowtree && eval "$(shadowtree completion zsh)"
    if (( $+functions[compdef] )); then
        _zfm_command_exists golangci-lint && eval "$(golangci-lint completion zsh)"
    fi
    # live cwd from Herdr. Load it only outside Herdr panes.
    if [[ ${HERDR_ENV:-} != 1 ]]; then
    fi
    _zfm_command_exists fastfetch && fastfetch
fi


if _zfm_command_exists eza; then
    alias ls='eza -al --color=always --group-directories-first --icons=always'
    alias la='eza -a --color=always --group-directories-first --icons=always'
    alias ll='eza -l --color=always --group-directories-first --icons=always'
    alias lt='eza -aT --color=always --group-directories-first --icons=always'
    alias l.="eza -a | grep -e '^\.'"
fi

alias tmux='tmux -u'
alias c=clear
if _zfm_command_exists z; then
    alias cd=z
fi
if _zfm_command_exists tldr; then
    alias man=tldr
fi
alias nano="$EDITOR"
alias edit="$EDITOR_INTERACTIVE"

if _zfm_command_exists docker; then
    alias dc='docker compose'
    alias d=docker
    alias dclog='docker compose logs -f'
    alias dcup='docker compose up -d'
    alias dcdown='docker compose down'
fi

if _zfm_command_exists podman; then
    alias pc='podman compose'
    alias p=podman
    alias pclog='podman compose logs -f'
    alias pcup='podman compose up -d'
    alias pcdown='podman compose down'
fi

if _zfm_command_exists git; then
    alias g='git'
    alias ga='git add'
    alias gaa='git add --all'
    alias gb='git branch'
    alias gba='git branch -a'
    alias gbd='git branch -d'
    alias gc='git commit'
    alias gcm='git commit -m'
    alias gca='git commit --amend'
    alias gco='git checkout'
    alias gcours='git checkout --ours'
    alias gcb='git checkout -b'
    alias gcp='git cherry-pick'
    alias gcpc='git cherry-pick --continue'
    alias gcpa='git cherry-pick --abort'
    alias gd='git diff'
    alias gds='git diff --staged'
    alias gl='git log --oneline --decorate --graph -20'
    alias gpl='git pull --rebase'
    alias gps='git push'
    alias gs='git status -sb'
    alias grc='git rebase --continue'
    alias gra='git rebase --abort'
    alias grsh1='git reset --soft HEAD~1'
    alias 'gc!'='git agent commit'
    alias 'gca!'='git agent commit --amend'
fi

if _zfm_command_exists pi; then
fi

disk-usage() {
    df -h / | tail -1 | awk '{print $3 "/" $2 " (" $5 ")"}'
}

disk-clean() {
    local before after
    before=$(disk-usage)
    if _zfm_command_exists find && _zfm_command_exists bun; then
        find "$HOME/projects" -type f -name package.json 2>/dev/null \
            | grep -v node_modules \
            | xargs -r -n1 dirname \
            | xargs -r -I {} bun pm --cwd {} cache rm >/dev/null 2>&1
        bun pm -g cache rm
    fi
    _zfm_command_exists uv && uv cache clean
    _zfm_command_exists pip && pip cache purge
    _zfm_command_exists npm && npm cache clean --force
    _zfm_command_exists deno && deno clean
    _zfm_command_exists dotslash && dotslash -- clean
    _zfm_command_exists golangci-lint && golangci-lint cache clean
    _zfm_command_exists tldr && tldr --clear-cache
    _zfm_command_exists oh-my-posh && oh-my-posh cache clear
    _zfm_command_exists go && go clean -cache && go clean -modcache && go clean -fuzzcache
    _zfm_command_exists journalctl && sudo journalctl --vacuum-size=500M --vacuum-time=3d >/dev/null 2>&1
    _zfm_command_exists yay && yes | yay -Sc >/dev/null 2>&1
    _zfm_command_exists brew && brew cleanup --prune=all
    after=$(disk-usage)
    print -- "$before -> $after"
}

mkcd() {
    if [[ -z ${1:-} ]]; then
        print -- "mkcd <directory>"
        return 1
    fi

    mkdir -p -- "$1" && cd -- "$1"
}

groot() {
    local root
    root=$(git rev-parse --show-toplevel 2>/dev/null)
    if [[ -z "$root" ]]; then
        print -- "groot: not inside a git repository"
        return 1
    fi

    cd -- "$root"
}

if [[ -d "$HOME/.bun" ]]; then
    export BUN_INSTALL="$HOME/.bun"
    _zfm_path_prepend "$BUN_INSTALL/bin"
fi



claude-plugin-update() {
    claude plugin list --json \
        | jq -r '.[].id' \
        | xargs -r -n1 claude plugin update
}

_zfm_command_exists fzf || echo-error "fzf is not installed or not in PATH"
_zfm_command_exists rg || echo-error "rg is not installed or not in PATH"

ff() {
    local target
    target=$(rg --files --hidden -g "!.git" | fzf --query="${1:-}")
    if [[ -n "$target" ]]; then
        "$EDITOR_INTERACTIVE" "$target"
    fi
}

rgfzf-go() {
    local keyword=${1:-}
    local goroot
    goroot=$(go env GOROOT 2>/dev/null)
    if [[ -z "$goroot" || "$goroot" == null ]]; then
        echo-error "rgfzf-go: Could not determine GOROOT"
        return 1
    fi

    rg --no-ignore --hidden -n --glob '**/*.go' -- "$keyword" "$goroot/src" | fzf
}

_zfm_command_exists atuin || echo-error "atuin is not installed or not in PATH"

atuin-cleanup() {
    atuin search --exclude-exit=0 "" --delete
}

_zfm_path_prepend "$HOME/.opencode/bin"

export PNPM_HOME="$HOME/.local/share/pnpm"
path=("$PNPM_HOME/bin" ${path:#$PNPM_HOME/bin})

_zfm_path_prepend "$HOME/.grok/bin"

if [[ -o interactive ]] && (( $+functions[compdef] )); then
    _claude_use_settings() {
        local -a settings
        settings=("$HOME"/.claude/*.settings.json(N:t:r:r))
        _describe -t settings 'claude setting' settings
    }
fi

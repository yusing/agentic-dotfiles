if type -q /opt/homebrew/bin/brew
    eval "$(/opt/homebrew/bin/brew shellenv fish)"
end

if status is-interactive
    function echo-error -a message
        echo "$message" >&2
    end
else
    function echo-error
        return 1
    end
end

set -x OPENSPEC_TELEMETRY 0
set -x DO_NOT_TRACK 1
set -x DISABLE_TELEMETRY 1
set -x OMO_DISABLE_POSTHOG 1

set -x NODE_OPTIONS "--max-old-space-size=8192"


function check-command -a command
    if not type -q $command
        echo-error "$command is not installed or not in PATH"
        return 1
    end
end

function @check-command -a command
    if not type -q $command
        return 1
    end
end

function check-path -a path
    if not test -d $path
        echo-error "$path is not a directory"
        return 1
    end
end

function check-file -a file
    if not test -f $file
        echo-error "$file is not a file"
        return 1
    end
end

# bun
if check-path ~/.bun
    set --export BUN_INSTALL "$HOME/.bun"
    fish_add_path $BUN_INSTALL/bin
end

if type -q toe; and type -q tput
    set -l term_family

    if set -q HERDR_ENV; and test "$HERDR_ENV" = 1
        if not set -q TERM
            set term_family ghostty
        else if contains -- "$TERM" xterm xterm-256color
            set term_family ghostty
        end
    else if not set -q TERM
        set -l term_program
        set -q TERM_PROGRAM; and set term_program (string lower -- "$TERM_PROGRAM")

        if set -q GHOSTTY_RESOURCES_DIR; or string match -q '*ghostty*' -- "$term_program"
            set term_family ghostty
        else if set -q ALACRITTY_WINDOW_ID; or set -q ALACRITTY_SOCKET; or string match -q '*alacritty*' -- "$term_program"
            set term_family alacritty
        else if string match -q '*kaku*' -- "$term_program"
            set term_family kaku
        else if string match -q '*xtermjs*' -- "$term_program"; or string match -q '*xterm.js*' -- "$term_program"; or string match -q '*vscode*' -- "$term_program"
            set term_family xterm
        end
    end

    if test -n "$term_family"
        set -l best_term
        set -l best_colors -1
        for term in (toe -a 2>/dev/null | string replace -r '[[:space:]].*$' '')
            switch $term_family
                case ghostty
                    string match -rq '^(ghostty|xterm-ghostty)$' -- "$term"; or continue
                case alacritty
                    string match -rq '^alacritty($|-)' -- "$term"; or continue
                case kaku
                    string match -rq '^kaku($|-)' -- "$term"; or continue
                case xterm
                    string match -rq '^xterm($|-)' -- "$term"; or continue
            end

            set -l colors (tput -T "$term" colors 2>/dev/null)
            string match -rq '^[0-9]+$' -- "$colors"; or continue
            if test "$colors" -gt "$best_colors"
                set best_term $term
                set best_colors $colors
            else if test "$colors" -eq "$best_colors"
                if test "$term_family" = ghostty; and test "$term" = xterm-ghostty
                    set best_term $term
                    set best_colors $colors
                else if test "$term_family" != ghostty; and test (string length -- "$term") -lt (string length -- "$best_term")
                    set best_term $term
                    set best_colors $colors
                end
            end
        end

        test -n "$best_term"; and set -gx TERM $best_term
    end
end

if not set -q COLORTERM; and set -q TERM; and type -q tput
    set -l colors (tput colors 2>/dev/null)
    if test "$colors" -ge 16777216 2>/dev/null; or tput RGB >/dev/null 2>&1; or tput Tc >/dev/null 2>&1
        set -gx COLORTERM truecolor
    end
end

# go
if not check-command go
    check-path ~/go/bin; and fish_add_path ~/go/bin
end

if not set -q GOPATH
    set -l gopath (go env GOPATH 2>/dev/null)
    if test -n "$gopath"
        set -gx GOPATH $gopath
    else if test -d ~/.local/go
        set -gx GOPATH ~/.local/go
    else if test -d ~/go
        set -gx GOPATH ~/go
    else
        echo-error "GOPATH is not set and neither is ~/.local/go"
        return 1
    end
end

# local bin
check-path ~/.local/bin; and fish_add_path ~/.local/bin

# docker
if check-command docker
    if test -z "$DOCKER_HOST"
        if test -S ~/.docker/run/docker.sock
            set -gx DOCKER_HOST "unix://$HOME/.docker/run/docker.sock"
        else
            set -gx DOCKER_HOST "unix:///var/run/docker.sock"
        end
    end
end


if check-command delta
  set -gx PAGER delta
end

# gpg and tty
set -gx GPG_TTY $(tty)
set -gx TTY $(tty)

# editor
if type -q micro
    set -gx EDITOR micro
else
    set -gx EDITOR nano
end

set -gx EDITOR_INTERACTIVE $EDITOR

# make, just and shadowtree
check-command make
check-command just
check-command shadowtree

abbr --add --position command st 'shadowtree'

function make
    if test -f .shadowtree.toml
        command shadowtree $argv
    else if test -f Makefile
        command make $argv
    else if test -f Justfile
        command just $argv
    else
        echo-error "No Makefile or Justfile found."
        return 1
    end
end

# initialize interactive sessions
if status is-interactive
    # Commands to run in interactive sessions can go here
    check-command oh-my-posh; and oh-my-posh init fish --config catppuccin_macchiato | source
    check-command atuin; and atuin init fish | source
    check-command fzf; and fzf --fish | source
    check-command zoxide; and zoxide init fish | source
    check-command golangci-lint; and golangci-lint completion fish | source
    check-command codex; and codex completion fish | source
    check-command grok; and grok completions fish | source
    check-command gh; and gh completion --shell fish | source
    check-command shadowtree; and shadowtree completion fish | source
    # live cwd from Herdr. Load it only outside Herdr panes.
    # if test "$HERDR_ENV" != 1
    # end
end



function fish_greeting
    if type -q fastfetch
        fastfetch
    end
end

set -gx HOMEBREW_AUTO_UPDATE_SECS 86400

# Title options
set -g theme_title_display_process yes
set -g theme_title_display_path yes
set -g theme_title_display_user yes
set -g theme_title_use_abbreviated_path yes

# Prompt options
set -g theme_display_ruby yes
set -g theme_display_virtualenv yes
set -g theme_display_vagrant no
set -g theme_display_vi yes
set -g theme_display_k8s_context no # yes
set -g theme_display_user yes
set -g theme_display_hostname yes
set -g theme_show_exit_status yes
set -g theme_git_worktree_support no
set -g theme_display_git yes
set -g theme_display_git_dirty yes
set -g theme_display_git_untracked yes
set -g theme_display_git_ahead_verbose yes
set -g theme_display_git_dirty_verbose yes
set -g theme_display_git_master_branch yes
set -g theme_display_date yes
set -g theme_display_cmd_duration yes
set -g theme_powerline_fonts yes
set -g theme_nerd_fonts yes
set -g theme_color_scheme solarized-dark

if check-command eza
    alias ls 'eza -al --color=always --group-directories-first --icons=always'
    alias la 'eza -a --color=always --group-directories-first --icons=always'
    alias ll 'eza -l --color=always --group-directories-first --icons=always'
    alias lt 'eza -aT --color=always --group-directories-first --icons=always'
    alias l. "eza -a | grep -e '^\.'"
end

abbr --add --position command tmux 'tmux -u'
abbr --add --position command c clear
if check-command z
    abbr --add --position command cd z
end
if check-command tldr
    abbr --add --position command man tldr
end
abbr --add --position command nano $EDITOR
abbr --add --position command edit $EDITOR_INTERACTIVE

if check-command docker
    abbr --add --position command dc 'docker compose'
    abbr --add --position command d docker
    abbr --add --position command dclog 'docker compose logs -f'
    abbr --add --position command dcup 'docker compose up -d'
    abbr --add --position command dcdown 'docker compose down'
end

if check-command podman
    abbr --add --position command pc 'podman compose'
    abbr --add --position command p podman
    abbr --add --position command pclog 'podman compose logs -f'
    abbr --add --position command pcup 'podman compose up -d'
    abbr --add --position command pcdown 'podman compose down'
end

# git shortcuts
if check-command git
    abbr --add --position command g git
    abbr --add --position command ga 'git add'
    abbr --add --position command gaa 'git add --all'
    abbr --add --position command gb 'git branch'
    abbr --add --position command gba 'git branch -a'
    abbr --add --position command gbd 'git branch -d'
    abbr --add --position command gc 'git commit'
    abbr --add --position command gcm 'git commit -m'
    abbr --add --position command gca 'git commit --amend'
    abbr --add --position command gco 'git checkout'
    abbr --add --position command gcours 'git checkout --ours'
    abbr --add --position command gcb 'git checkout -b'
    abbr --add --position command gcp 'git cherry-pick'
    abbr --add --position command gcpc 'git cherry-pick --continue'
    abbr --add --position command gcpa 'git cherry-pick --abort'
    abbr --add --position command gd 'git diff'
    abbr --add --position command gds 'git diff --staged'
    abbr --add --position command gl 'git log --oneline --decorate --graph -20'
    abbr --add --position command gpl 'git pull --rebase'
    abbr --add --position command gps 'git push'
    abbr --add --position command gs 'git status -sb'
    abbr --add --position command grc 'git rebase --continue'
    abbr --add --position command gra 'git rebase --abort'
    abbr --add --position command grsh1 'git reset --soft HEAD~1'
    abbr --add --position command gc! 'git agent commit'
    abbr --add --position command gca! 'git agent commit --amend'
end

if check-command pi
end

function disk-usage
    # Output example: 55G/900G (6%)
    df -h / | tail -1 | awk '{print $3 "/" $2 " (" $5 ")"}'
end

function disk-clean
    set -l before (disk-usage)
    @check-command find; and find ~/projects -type f -name package.json | grep -v node_modules | xargs -n1 dirname | xargs -I {} bun pm --cwd {} cache rm > /dev/null 2>&1
    @check-command uv; and uv cache clean
    @check-command pip; and pip cache purge
    @check-command npm; and npm cache clean --force
    @check-command deno; and deno clean
    @check-command dotslash; and dotslash -- clean
    @check-command golangci-lint; and golangci-lint cache clean
    @check-command tldr; and tldr --clear-cache
    @check-command oh-my-posh; and oh-my-posh cache clear
    @check-command go; and go clean -cache && go clean -modcache && go clean -fuzzcache
    @check-command journalctl; and sudo journalctl --vacuum-size=500M --vacuum-time=3d > /dev/null 2>&1
    @check-command yay; and yes | yay -Sc > /dev/null 2>&1
    @check-command bun; and bun pm -g cache rm
    @check-command brew; and brew cleanup --prune=all
    set -l after (disk-usage)
    echo "$before -> $after"
end

function mkcd -a dir
    if test -z "$dir"
        echo "mkcd <directory>"
        return 1
    end

    mkdir -p -- "$dir"; and cd -- "$dir"
end

function groot
    set -l root (git rev-parse --show-toplevel 2>/dev/null)
    if test -z "$root"
        echo "groot: not inside a git repository"
        return 1
    end

    cd -- "$root"
end

# claude code

set -gx CLAUDE_PACKAGE_MANAGER bun



function claude-plugin-update --description "Update all installed Claude plugins"
    claude plugin list --json \
        | jq -r '.[].id' \
        | xargs -r -n1 claude plugin update
end

# rg and fzf
check-command fzf
check-command rg

function ff -a query
    set -l target (rg --files --hidden -g "!.git" | fzf --query="$query")
    if test -n "$target"
        $EDITOR_INTERACTIVE "$target"
    end
end

function rgfzf-go -a keyword
    set -l goroot (go env GOROOT 2>/dev/null)
    if test -z "$goroot" -o "$goroot" = null
        echo-error "rgfzf-go: Could not determine GOROOT"
        return 1
    end

    rg --no-ignore --hidden -n --glob '**/*.go' $keyword "$goroot/src" | fzf
end

# atuin
check-command atuin

function atuin-cleanup
    # remove all entries with non-zero exit code
    atuin search --exclude-exit=0 "" --delete
end

# opencode
fish_add_path $HOME/.opencode/bin

# pnpm
set -gx PNPM_HOME "$HOME/.local/share/pnpm"
if not string match -q -- "$PNPM_HOME/bin" $PATH
  set -gx PATH "$PNPM_HOME/bin" $PATH
end
# pnpm end


# >>> grok installer >>>
fish_add_path $HOME/.grok/bin
# <<< grok installer <<<

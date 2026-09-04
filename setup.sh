#!/bin/bash
# Bootstrap this home directory as a checkout of yusing/agentic-dotfiles and
# install the packages and tools the shell configuration expects.
#
# Safe to re-run after a mid-flight failure. Unrelated files already in $HOME
# are left in place. Files that would be overwritten by the checkout are copied
# to ~/.local/share/dotfiles-setup/ first.

set -euo pipefail

REPO_URL="https://github.com/yusing/agentic-dotfiles.git"
REPO_SLUG="yusing/agentic-dotfiles"
PRIVATE_REPO_SLUG="yusing/dotfiles"
GIT_NAME="yusing"
GIT_EMAIL="yusing.wys@gmail.com"
GO_PREFIX="${HOME}/.local/opt/go"
LOCAL_BIN="${HOME}/.local/bin"
GOBIN="${HOME}/go/bin"
BACKUP_ROOT="${HOME}/.local/share/dotfiles-setup"

STEP="starting"
trap 'printf "setup.sh failed during: %s\n" "$STEP" >&2' ERR

log() { printf '%s\n' "$*"; }
info() { printf '==> %s\n' "$*"; }
warn() { printf 'warning: %s\n' "$*" >&2; }
die() { printf 'error: %s\n' "$*" >&2; exit 1; }

have() { command -v "$1" >/dev/null 2>&1; }

run_root() {
  if [ "$(id -u)" -eq 0 ]; then
    "$@"
  else
    sudo "$@"
  fi
}

# ---------------------------------------------------------------------------
# PATH and OS
# ---------------------------------------------------------------------------

export PATH="${GOBIN}:${LOCAL_BIN}:${GO_PREFIX}/bin:${HOME}/.bun/bin:${HOME}/.atuin/bin:${HOME}/.grok/bin:${PATH}"
export GOBIN
export DEBIAN_FRONTEND=noninteractive
export NONINTERACTIVE=1
export GIT_TERMINAL_PROMPT=0

OS="$(uname -s)"
ARCH="$(uname -m)"
case "$ARCH" in
  x86_64) GOARCH=amd64 ;;
  aarch64|arm64) GOARCH=arm64 ;;
  *) die "unsupported architecture: $ARCH" ;;
esac

PM=""

detect_pm() {
  case "$OS" in
    Darwin)
      PM=brew
      ;;
    Linux)
      [ -r /etc/os-release ] || die "cannot detect distro: /etc/os-release is missing"
      # shellcheck disable=SC1091
      . /etc/os-release
      case "${ID:-}" in
        ubuntu|debian)
          PM=apt
          ;;
        arch|cachyos)
          PM=pacman
          ;;
        *)
          case " ${ID_LIKE:-} " in
            *" arch "*)
              PM=pacman
              ;;
            *" debian "*|*" ubuntu "*)
              PM=apt
              ;;
            *)
              die "unsupported linux distro: ${ID:-unknown}"
              ;;
          esac
          ;;
      esac
      ;;
    *)
      die "unsupported OS: $OS"
      ;;
  esac
}

load_brew_env() {
  if [ -x /opt/homebrew/bin/brew ]; then
    eval "$(/opt/homebrew/bin/brew shellenv)"
  elif [ -x /usr/local/bin/brew ]; then
    eval "$(/usr/local/bin/brew shellenv)"
  elif have brew; then
    eval "$(brew shellenv)"
  fi
}

ensure_brew() {
  [ "$PM" = brew ] || return 0
  load_brew_env
  if have brew; then
    return 0
  fi
  info "installing Homebrew"
  /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
  load_brew_env
  have brew || die "Homebrew installed but brew is not on PATH"
}

# yay-bin is used for the AUR bootstrap because it does not need a Go toolchain
# (this script installs the latest Go later).
ensure_yay() {
  local tmp
  [ "$PM" = pacman ] || return 0
  if have yay; then
    return 0
  fi
  info "installing yay"
  if run_root pacman -S --needed --noconfirm yay && have yay; then
    return 0
  fi
  run_root pacman -S --needed --noconfirm git base-devel \
    || die "git and base-devel are required to build yay"
  have git || die "git is required to build yay"
  if [ "$(id -u)" -eq 0 ]; then
    die "yay is not in the pacman repos and cannot be built as root; install yay and re-run"
  fi
  tmp="$(mktemp -d "${TMPDIR:-/tmp}/setup-yay.XXXXXX")"
  git clone --depth 1 https://aur.archlinux.org/yay-bin.git "$tmp/yay-bin"
  (cd "$tmp/yay-bin" && makepkg -si --noconfirm)
  rm -rf "$tmp"
  hash -r 2>/dev/null || true
  have yay || die "yay is required on Arch"
}

ensure_sudo() {
  [ "$PM" = brew ] && return 0
  if [ "$(id -u)" -eq 0 ]; then
    return 0
  fi
  have sudo || die "sudo is required to install packages"
  sudo -v
  (
    while true; do
      sudo -n true
      sleep 60
      kill -0 "$$" || exit
    done
  ) 2>/dev/null &
}

# ---------------------------------------------------------------------------
# Package mapping: logical name -> distro/brew package
# ---------------------------------------------------------------------------

# Prints one or more package-manager names for a logical package, or an empty
# line if this manager has nothing to install for it.
mapped_pkgs() {
  local name="$1"
  case "$name" in
    fish|git|curl|jq|unzip|wget|make|just|ripgrep|fzf|zoxide|eza|micro|tmux|git-lfs|atuin|lazygit|fastfetch|imagemagick)
      printf '%s\n' "$name"
      ;;
    delta) printf '%s\n' git-delta ;;
    gh)
      if [ "$PM" = pacman ]; then
        printf '%s\n' github-cli
      else
        printf '%s\n' gh
      fi
      ;;
    tldr)
      if [ "$PM" = apt ]; then
        printf '%s\n' tealdeer tldr
      else
        printf '%s\n' tealdeer
      fi
      ;;
    python3)
      if [ "$PM" = apt ]; then
        printf '%s\n' python3
      else
        printf '%s\n' python
      fi
      ;;
    gpg) printf '%s\n' gnupg ;;
    ncurses)
      if [ "$PM" = apt ]; then
        printf '%s\n' ncurses-bin
      else
        printf '%s\n' ncurses
      fi
      ;;
    ca-certificates)
      if [ "$PM" = brew ]; then
        printf '\n'
      else
        printf '%s\n' ca-certificates
      fi
      ;;
    build-essential)
      case "$PM" in
        apt) printf '%s\n' build-essential ;;
        pacman) printf '%s\n' base-devel ;;
        brew) printf '\n' ;;
      esac
      ;;
    *)
      die "unknown logical package: $name"
      ;;
  esac
}

# Command that should exist after the logical package is installed.
pkg_cmd() {
  case "$1" in
    ripgrep) echo rg ;;
    ncurses) echo tput ;;
    build-essential) echo gcc ;;
    ca-certificates) echo "" ;;
    *) echo "$1" ;;
  esac
}

have_logical() {
  local cmd
  if [ "$1" = ca-certificates ] && [ "$PM" = apt ]; then
    dpkg-query -W -f='${Status}\n' ca-certificates 2>/dev/null \
      | grep -q 'install ok installed'
    return
  fi
  if [ "$1" = imagemagick ]; then
    have magick || have convert
    return
  fi
  cmd="$(pkg_cmd "$1")"
  # Packages without a command probe are left to package managers whose
  # install operations already skip current packages.
  [ -z "$cmd" ] && return 1
  if [ "$cmd" = python3 ] && ! have python3; then
    have python
    return
  fi
  have "$cmd"
}

py() {
  if have python3; then
    python3 "$@"
  elif have python; then
    python "$@"
  else
    die "python3 is required"
  fi
}

# Direct installs owned by this script live under these user-local roots. If a
# command resolves elsewhere, leave updates to the package manager that owns it.
direct_install_needed() {
  local cmd="$1" home path
  if ! have "$cmd"; then
    return 0
  fi
  home="$(realpath "$HOME")"
  path="$(realpath "$(command -v "$cmd")")"
  case "$path" in
    "${home}/.local/bin/"*|"${home}/.local/opt/go/"*|"${home}/.bun/bin/"*|"${home}/.atuin/bin/"*|"${home}/.fzf/bin/"*|"${home}/.grok/bin/"*|"${home}/go/bin/"*)
      return 0
      ;;
    *)
      return 1
      ;;
  esac
}

refresh_pm() {
  case "$PM" in
    apt)
      run_root apt-get update -y
      ;;
    pacman)
      run_root pacman -Syu --noconfirm
      ;;
    brew)
      # brew install refreshes as needed; a full update is slow on reruns
      true
      ;;
  esac
}

apt_pkg_available() {
  local cand
  # apt-cache show can succeed for a package with no installable version.
  # "Candidate: (none)" is what later becomes "has no installation candidate"
  # and would abort a whole apt-get batch.
  cand="$(apt-cache policy "$1" 2>/dev/null | awk '$1 == "Candidate:" { print $2; exit }')"
  [ -n "$cand" ] && [ "$cand" != "(none)" ]
}

# Prints the first mapped package that this machine can actually install.
# Exit 0 with empty output if this package manager has nothing to install.
# Exit 1 if every mapped name lacks an install candidate.
select_mapped_pkg() {
  local name="$1" pkg any=0
  while IFS= read -r pkg; do
    [ -n "$pkg" ] || continue
    any=1
    if [ "$PM" != apt ]; then
      printf '%s\n' "$pkg"
      return 0
    fi
    if apt_pkg_available "$pkg"; then
      printf '%s\n' "$pkg"
      return 0
    fi
  done <<EOF
$(mapped_pkgs "$name")
EOF
  [ "$any" -eq 0 ]
}

pm_install_batch() {
  [ "$#" -gt 0 ] || return 0
  case "$PM" in
    apt)
      run_root apt-get install -y "$@"
      ;;
    pacman)
      if have yay && [ "$(id -u)" -ne 0 ]; then
        yay -S --needed --noconfirm --answerclean None --answerdiff None "$@"
      else
        run_root pacman -S --needed --noconfirm "$@"
      fi
      ;;
    brew)
      brew install --no-ask "$@"
      ;;
    *)
      die "unknown package manager: $PM"
      ;;
  esac
}

# install_packages NAME... [--optional NAME...]
# One package-manager transaction for the whole list. Optional names that are
# missing from the apt index are skipped so a single unknown package cannot
# split the install back into a per-package loop (and re-trigger initramfs).
install_packages() {
  local name pkg cmd mode=required apt_refreshed=0
  local required_names=()
  local pkgs=()

  for name in "$@"; do
    if [ "$name" = --optional ]; then
      mode=optional
      continue
    fi
    if [ "$mode" = required ]; then
      required_names+=("$name")
    fi
    if have_logical "$name"; then
      continue
    fi
    if [ "$PM" = apt ] && [ "$apt_refreshed" -eq 0 ]; then
      refresh_pm
      apt_refreshed=1
    fi
    if ! pkg="$(select_mapped_pkg "$name")"; then
      if [ "$mode" = required ]; then
        die "required package $name has no install candidate"
      fi
      warn "$name has no package candidate; will try another install path if one exists"
      continue
    fi
    [ -n "$pkg" ] || continue
    pkgs+=("$pkg")
  done

  if [ "${#pkgs[@]}" -eq 0 ]; then
    return 0
  fi

  info "installing ${pkgs[*]}"
  if ! pm_install_batch "${pkgs[@]}"; then
    retry_batch_without_unavailable || true
    if [ "${#required_names[@]}" -gt 0 ]; then
      for name in "${required_names[@]}"; do
        cmd="$(pkg_cmd "$name")"
        [ -n "$cmd" ] || continue
        if ! have_logical "$name"; then
          die "failed to install required package: $name"
        fi
      done
    fi
    warn "batch install reported failure; optional packages may be missing"
  fi
  hash -r 2>/dev/null || true
}

# After a failed apt transaction, drop packages that are already installed or
# still have no candidate and retry the remainder once as a batch. Never
# falls back to installing packages one by one. Pacman/brew have no equivalent
# candidate filter here, so they do not retry.
retry_batch_without_unavailable() {
  local pkg retry=() i=0
  [ "$PM" = apt ] || return 1
  while [ "$i" -lt "${#pkgs[@]}" ]; do
    pkg="${pkgs[$i]}"
    i=$((i + 1))
    if dpkg-query -W -f='${Status}\n' "$pkg" 2>/dev/null | grep -q 'install ok installed'; then
      continue
    fi
    apt_pkg_available "$pkg" || continue
    retry+=("$pkg")
  done
  if [ "${#retry[@]}" -eq 0 ]; then
    return 1
  fi
  if [ "${#retry[@]}" -eq "${#pkgs[@]}" ]; then
    return 1
  fi
  info "retrying batch without unavailable packages: ${retry[*]}"
  pm_install_batch "${retry[@]}"
}

# ---------------------------------------------------------------------------
# Git identity and $HOME checkout
# ---------------------------------------------------------------------------

configure_git_identity() {
  local current
  current="$(git config --global --get user.name 2>/dev/null || true)"
  if [ "$current" != "$GIT_NAME" ]; then
    git config --global user.name "$GIT_NAME"
  fi
  current="$(git config --global --get user.email 2>/dev/null || true)"
  if [ "$current" != "$GIT_EMAIL" ]; then
    git config --global user.email "$GIT_EMAIL"
  fi
  current="$(git config --global --get init.defaultBranch 2>/dev/null || true)"
  if [ "$current" != main ]; then
    git config --global init.defaultBranch main
  fi
}

ensure_origin() {
  local url=""
  if url="$(git remote get-url origin 2>/dev/null)"; then
    case "$url" in
      *github.com[:/]"$REPO_SLUG"*) return 0 ;;
      *[:/]"$PRIVATE_REPO_SLUG"|*[:/]"$PRIVATE_REPO_SLUG".git) return 1 ;;
    esac
    die "origin is $url; refusing to replace a different repository in $HOME"
  fi
  git remote add origin "$REPO_URL"
}

# Copy overlapping paths out of the way so a dirty $HOME can still take the
# tracked files from origin/main. Identical untracked files still have to move;
# git will not overwrite them in place.
backup_checkout_collisions() {
  local ref="$1"
  local path local_path tracked origin_hash local_hash
  local backed=0

  BACKUP_DIR="${BACKUP_ROOT}/backup-$(date +%Y%m%d%H%M%S)"

  while IFS= read -r -d '' path; do
    local_path="${HOME}/${path}"
    if [ ! -e "$local_path" ] && [ ! -L "$local_path" ]; then
      continue
    fi

    tracked=0
    if git rev-parse --verify --quiet HEAD >/dev/null \
      && git ls-files --error-unmatch -- "$path" >/dev/null 2>&1; then
      tracked=1
    fi

    if [ "$tracked" -eq 1 ]; then
      # Tracked files are stashed or updated by pull; do not move them here.
      continue
    fi

    # Untracked (or type-conflicting) path that origin also has.
    if [ -f "$local_path" ] && [ ! -L "$local_path" ]; then
      origin_hash="$(git rev-parse "${ref}:${path}")"
      local_hash="$(git hash-object "$local_path")"
      if [ "$origin_hash" = "$local_hash" ]; then
        rm -f "$local_path"
        continue
      fi
    fi

    mkdir -p "$(dirname "${BACKUP_DIR}/${path}")"
    cp -a "$local_path" "${BACKUP_DIR}/${path}"
    rm -rf "$local_path"
    backed=1
  done < <(git ls-tree -z -r --name-only "$ref")

  if [ "$backed" -eq 1 ]; then
    info "backed up overlapping home files to ${BACKUP_DIR}"
  else
    rmdir "$BACKUP_DIR" 2>/dev/null || true
  fi
}

drop_bootstrap_empty_commit() {
  local ahead
  git rev-parse --verify --quiet HEAD >/dev/null || return 0
  git show-ref --verify --quiet refs/remotes/origin/main || return 0
  ahead="$(git rev-list --count origin/main..HEAD)"
  # Mixed reset keeps dirty tracked files. checkout -f would throw them away.
  if [ "$ahead" -eq 1 ] \
    && [ "$(git log -1 --format=%s)" = rebase ] \
    && [ -z "$(git diff --stat origin/main HEAD)" ]; then
    info "dropping leftover bootstrap commit"
    git reset origin/main
  fi
}

setup_home_repo() {
  local update_checkout
  cd "$HOME"

  if [ ! -d .git ]; then
    info "initializing git repository in $HOME"
    if git init -b main >/dev/null 2>&1; then
      true
    else
      git init
      git checkout -B main >/dev/null 2>&1 || true
    fi
  fi

  # A recognized private source checkout is already authoritative. Keep its
  # origin, history, and identity, but still activate the tracked hooks.
  if ensure_origin; then
    update_checkout=1
  else
    update_checkout=0
  fi
  git config --local core.hooksPath .githooks
  if [ "$update_checkout" -eq 0 ]; then
    info "preserving private repository checkout at $HOME"
    return 0
  fi

  configure_git_identity
  info "fetching origin"
  git fetch origin

  git show-ref --verify --quiet refs/remotes/origin/main \
    || die "origin/main does not exist on $REPO_URL"

  backup_checkout_collisions origin/main

  if ! git rev-parse --verify --quiet HEAD >/dev/null; then
    info "checking out origin/main"
    git checkout -f -B main origin/main
    return 0
  fi

  drop_bootstrap_empty_commit

  if [ "$(git symbolic-ref --short HEAD 2>/dev/null || true)" != main ]; then
    git branch -M main 2>/dev/null || git checkout -B main
  fi

  if ! git diff --quiet || ! git diff --cached --quiet; then
    info "stashing local tracked changes"
    git stash push -m "setup.sh: local tracked changes"
    STASHED=1
  else
    STASHED=0
  fi

  info "rebasing onto origin/main"
  if ! git pull --rebase origin main; then
    git rebase --abort >/dev/null 2>&1 || true
    if [ "${STASHED:-0}" -eq 1 ]; then
      git stash pop || true
    fi
    die "git pull --rebase origin main failed; resolve the repo in $HOME and re-run"
  fi

  if [ "${STASHED:-0}" -eq 1 ]; then
    git stash pop || warn "stash pop had conflicts; resolve them in $HOME"
  fi
}

rewrite_home_paths() {
  local changed
  changed="$(CONFIG_SOURCE_HOME="/home/${GIT_NAME}" py - <<'PY'
import os
import subprocess
from pathlib import Path

home = Path(os.environ["HOME"])
source_home = os.environ["CONFIG_SOURCE_HOME"]
tracked = subprocess.run(
    ["git", "ls-files", "-z"],
    check=True,
    stdout=subprocess.PIPE,
).stdout.decode().split("\0")


def is_runtime_config(path: Path) -> bool:
    name = path.as_posix()
    if name in {
        ".claude/settings.json",
        ".codex/config.toml",
        ".codex/hooks.json",
        ".config/fish/config.fish",
        ".gitconfig",
        ".grok/config.toml",
        ".bashrc",
        ".zsh/fish-mirror.zsh",
        ".zshrc",
    }:
        return True
    if name.startswith(".claude/agents/"):
        return path.suffix == ".md"
    if name.startswith(".codex/agents/"):
        return path.suffix == ".toml"
    if name.startswith(".grok/hooks/"):
        return path.suffix in {".json", ".toml", ".yaml", ".yml"}
    return name.startswith(".config/") and path.suffix in {
        ".json",
        ".toml",
        ".yaml",
        ".yml",
    }


changed = 0
for name in tracked:
    relative = Path(name)
    if not name or not is_runtime_config(relative):
        continue
    path = home / relative
    if not path.is_file() or path.is_symlink():
        continue
    text = path.read_text(encoding="utf-8")
    resolved = text.replace(source_home, str(home))
    if relative.parts[0] in {".claude", ".codex", ".grok"}:
        resolved = resolved.replace("$HOME", str(home))
    if resolved == text:
        continue
    path.write_text(resolved, encoding="utf-8")
    changed += 1

print(changed)
PY
)"
  if [ "$changed" -gt 0 ]; then
    info "resolved home paths in $changed configuration files"
  fi
}

# ---------------------------------------------------------------------------
# Latest Go toolchain (go.dev), not the distro package
# ---------------------------------------------------------------------------

latest_go_version() {
  curl -fsSL "https://go.dev/VERSION?m=text" | head -n 1
}

sha256_check() {
  local hash="$1" file="$2"
  if have sha256sum; then
    printf '%s  %s\n' "$hash" "$file" | sha256sum -c -
  else
    printf '%s  %s\n' "$hash" "$file" | shasum -a 256 -c -
  fi
}

install_latest_go() {
  local version filename url sha tmp tarball current goos
  version="$(latest_go_version)"
  [ -n "$version" ] || die "could not determine the latest Go version"
  if have go; then
    current="$(go env GOVERSION 2>/dev/null || true)"
    if [ "$current" = "$version" ]; then
      info "Go $version already installed at $(command -v go)"
      return 0
    fi
  fi

  case "$OS" in
    Darwin) goos=darwin ;;
    Linux) goos=linux ;;
  esac
  filename="${version}.${goos}-${GOARCH}.tar.gz"
  url="https://go.dev/dl/${filename}"
  info "installing ${version} from go.dev"

  sha="$(
    curl -fsSL "https://go.dev/dl/?mode=json" | py -c '
import json, sys
filename = sys.argv[1]
releases = json.load(sys.stdin)
for rel in releases:
    for f in rel.get("files", []):
        if f.get("filename") == filename:
            print(f.get("sha256", ""))
            raise SystemExit
' "$filename"
  )"
  [ -n "$sha" ] || die "no sha256 listed for $filename"

  tmp="$(mktemp -d "${TMPDIR:-/tmp}/setup-go.XXXXXX")"
  tarball="${tmp}/${filename}"
  curl -fsSL -o "$tarball" "$url"
  sha256_check "$sha" "$tarball"

  mkdir -p "$(dirname "$GO_PREFIX")" "$LOCAL_BIN"
  rm -rf "$GO_PREFIX"
  tar -C "$(dirname "$GO_PREFIX")" -xzf "$tarball"
  rm -rf "$tmp"

  ln -sfn "${GO_PREFIX}/bin/go" "${LOCAL_BIN}/go"
  ln -sfn "${GO_PREFIX}/bin/gofmt" "${LOCAL_BIN}/gofmt"
  hash -r 2>/dev/null || true
  have go || die "go installed to ${GO_PREFIX} but is not on PATH"
  log "Go $(go env GOVERSION) -> $(command -v go)"
}

# ---------------------------------------------------------------------------
# Official installers and Go modules
# ---------------------------------------------------------------------------

install_oh_my_posh() {
  direct_install_needed oh-my-posh || return 0
  info "installing/updating oh-my-posh"
  mkdir -p "$LOCAL_BIN"
  curl -fsSL https://ohmyposh.dev/install.sh | bash -s -- -d "$LOCAL_BIN"
}

install_claude() {
  direct_install_needed claude || return 0
  if have claude; then
    info "updating Claude Code"
    claude update
    return 0
  fi
  info "installing Claude Code"
  curl -fsSL https://claude.ai/install.sh | bash
}

install_codex() {
  direct_install_needed codex || return 0
  info "installing/updating Codex"
  curl -fsSL https://chatgpt.com/codex/install.sh | CODEX_NON_INTERACTIVE=1 sh
}

install_grok() {
  direct_install_needed grok || return 0
  if have grok; then
    info "updating Grok CLI"
    grok update
    return 0
  fi
  info "installing Grok CLI"
  curl -fsSL https://x.ai/cli/install.sh | bash
}

install_herdr() {
  direct_install_needed herdr || return 0
  info "installing/updating herdr"
  curl -fsSL https://herdr.dev/install.sh | sh
}

install_bun() {
  direct_install_needed bun || return 0
  if have bun; then
    info "updating bun"
    bun upgrade
    return 0
  fi
  info "installing bun"
  curl -fsSL https://bun.sh/install | bash
  export PATH="${HOME}/.bun/bin:${PATH}"
}

install_atuin() {
  direct_install_needed atuin || return 0
  if have atuin; then
    info "updating atuin"
    atuin update
    return 0
  fi
  if [ -x "${HOME}/.atuin/bin/atuin" ]; then
    ln -sfn "${HOME}/.atuin/bin/atuin" "${LOCAL_BIN}/atuin"
    export PATH="${HOME}/.atuin/bin:${PATH}"
    info "updating atuin"
    atuin update
    return 0
  fi
  info "installing atuin"
  mkdir -p "$LOCAL_BIN"
  ATUIN_NO_MODIFY_PATH=1 ATUIN_INSTALL_DIR="$HOME/.local" \
    curl --proto "=https" --tlsv1.2 -LsSf https://github.com/atuinsh/atuin/releases/latest/download/atuin-installer.sh | sh
}

install_just() {
  direct_install_needed just || return 0
  info "installing/updating just via official installer"
  curl --proto "=https" --tlsv1.2 -sSf https://just.systems/install.sh | bash -s -- --to "$LOCAL_BIN"
}

install_zoxide() {
  direct_install_needed zoxide || return 0
  info "installing/updating zoxide via official installer"
  curl -sSfL https://raw.githubusercontent.com/ajeetdsouza/zoxide/main/install.sh | sh
}

install_fzf() {
  # Distro fzf is often too old for `fzf --fish` (needs 0.48+).
  if have fzf && ! direct_install_needed fzf \
    && fzf --help 2>&1 | grep -q -- '--fish'; then
    return 0
  fi
  info "installing/updating fzf from GitHub"
  if ! git -C "${HOME}/.fzf" remote get-url origin 2>/dev/null | grep -q 'junegunn/fzf'; then
    rm -rf "${HOME}/.fzf"
    git clone --depth 1 https://github.com/junegunn/fzf.git "${HOME}/.fzf"
  else
    git -C "${HOME}/.fzf" pull --ff-only
  fi
  "${HOME}/.fzf/install" --bin --no-update-rc --no-key-bindings --no-completion
  mkdir -p "$LOCAL_BIN"
  ln -sfn "${HOME}/.fzf/bin/fzf" "${LOCAL_BIN}/fzf"
}

install_micro() {
  direct_install_needed micro || return 0
  info "installing/updating micro"
  (
    cd "$LOCAL_BIN"
    curl -fsS https://getmic.ro | bash
  )
}

install_tldr() {
  local path
  direct_install_needed tldr || return 0
  info "installing/updating tldr"
  if have tldr; then
    path="$(realpath "$(command -v tldr)")"
    if [ -e "${LOCAL_BIN}/tldr" ] \
      && [ "$path" = "$(realpath "${LOCAL_BIN}/tldr")" ]; then
      if py -m pip install --user --upgrade tldr; then
        return 0
      fi
      warn "failed to update tldr"
      return 0
    fi
  fi
  if bun install -g tldr@latest; then
    return 0
  fi
  if python3 -m pip install --user tldr; then
    return 0
  fi
  warn "tldr is still missing"
}

install_hunkdiff() {
  info "installing/updating hunkdiff"
  bun install -g hunkdiff@latest
}

install_golangci_lint() {
  direct_install_needed golangci-lint || return 0
  info "installing/updating golangci-lint"
  curl -sSfL https://golangci-lint.run/install.sh | sh -s -- -b "$GOBIN"
}

install_rtk() {
  direct_install_needed rtk || return 0
  info "installing/updating rtk"
  curl -fsSL https://raw.githubusercontent.com/rtk-ai/rtk/master/install.sh | sh
  hash -r 2>/dev/null || true
  have rtk && rtk gain >/dev/null 2>&1 \
    || die "rtk installed, but the Rust Token Killer CLI is not available"
}

# One `go install` per missing or directly managed tool. A single invocation
# cannot mix packages from different modules (gopls, x/tools, and the yusing
# tools are all separate).
migrate_go_tools() {
  local name source target
  mkdir -p "$GOBIN"
  for name in gopls goimports deadcode gitleaks lazygit skills-mgr git-agent shadowtree golangci-lint; do
    source="${LOCAL_BIN}/${name}"
    if [ ! -f "$source" ] && [ ! -L "$source" ]; then
      continue
    fi
    target="${GOBIN}/${name}"
    if [ -e "$target" ] || [ -L "$target" ]; then
      if [ -L "$target" ] && [ "$source" -ef "$target" ]; then
        rm -f "$target"
        mv "$source" "$target"
        info "migrated ${name} to ${GOBIN}"
      else
        rm -f "$source"
        info "removed legacy ${source}; ${target} already exists"
      fi
    else
      mv "$source" "$target"
      info "migrated ${name} to ${GOBIN}"
    fi
  done
  hash -r 2>/dev/null || true
}

install_go_tools() {
  local modules=() module
  migrate_go_tools
  direct_install_needed gopls && modules+=("golang.org/x/tools/gopls@latest")
  direct_install_needed goimports && modules+=("golang.org/x/tools/cmd/goimports@latest")
  direct_install_needed deadcode && modules+=("golang.org/x/tools/cmd/deadcode@latest")
  direct_install_needed gitleaks && modules+=("github.com/zricethezav/gitleaks/v8@latest")
  direct_install_needed lazygit && modules+=("github.com/jesseduffield/lazygit@latest")
  direct_install_needed skills-mgr && modules+=("github.com/yusing/skills-mgr@latest")
  direct_install_needed git-agent && modules+=("github.com/yusing/git-agent/cmd/git-agent@latest")
  direct_install_needed shadowtree && modules+=("github.com/yusing/shadowtree/cmd/shadowtree@latest")
  if [ "${#modules[@]}" -gt 0 ]; then
    for module in "${modules[@]}"; do
      info "go install ${module}"
      GOBIN="$GOBIN" go install "$module"
    done
  fi
  install_golangci_lint
}

# Independent installers run together, but each writes to its own log. Emit the
# completed logs in launch order so concurrent output never becomes interleaved.
run_independent_installs() (
  local log_root index log status failed=0
  local labels=(
    "just"
    "fzf"
    "zoxide"
    "micro"
    "atuin"
    "bun"
    "oh-my-posh"
    "Claude Code"
    "Codex"
    "Grok CLI"
    "herdr"
    "rtk"
    "Go tools"
  )
  local commands=(
    install_just
    install_fzf
    install_zoxide
    install_micro
    install_atuin
    install_bun
    install_oh_my_posh
    install_claude
    install_codex
    install_grok
    install_herdr
    install_rtk
    install_go_tools
  )
  local pids=()
  local logs=()

  log_root="$(mktemp -d "${TMPDIR:-/tmp}/setup-install.XXXXXX")"
  trap 'rm -rf "$log_root"' EXIT HUP INT TERM

  for ((index = 0; index < ${#commands[@]}; index++)); do
    log="${log_root}/${index}.log"
    logs[$index]="$log"
    info "starting ${labels[$index]}"
    (
      STEP="install ${labels[$index]}"
      "${commands[$index]}"
    ) >"$log" 2>&1 &
    pids[$index]=$!
  done

  for ((index = 0; index < ${#pids[@]}; index++)); do
    if wait "${pids[$index]}"; then
      status=0
    else
      status=$?
      failed=1
    fi

    info "install log: ${labels[$index]}"
    if [ -s "${logs[$index]}" ]; then
      cat "${logs[$index]}"
    else
      log "  completed with no output"
    fi
    if [ "$status" -ne 0 ]; then
      warn "${labels[$index]} installer failed with status $status"
    fi
  done

  [ "$failed" -eq 0 ] || die "one or more independent installers failed"
)

# ---------------------------------------------------------------------------
# Fish as login shell
# ---------------------------------------------------------------------------

ensure_fish_login_shell() {
  local shell_path current=""
  shell_path="$(command -v fish)" || die "fish is not installed"
  if have getent; then
    current="$(getent passwd "$(id -un)" 2>/dev/null | awk -F: '{print $NF}' || true)"
  fi
  if [ -z "$current" ]; then
    current="$(dscl . -read "/Users/$(id -un)" UserShell 2>/dev/null | awk '{print $2}' || true)"
  fi
  if [ "$current" = "$shell_path" ]; then
    return 0
  fi

  if [ -w /etc/shells ]; then
    grep -qxF "$shell_path" /etc/shells || printf '%s\n' "$shell_path" >>/etc/shells
  elif ! grep -qxF "$shell_path" /etc/shells 2>/dev/null; then
    printf '%s\n' "$shell_path" | run_root tee -a /etc/shells >/dev/null
  fi

  info "changing login shell to $shell_path"
  if have chsh; then
    if chsh -s "$shell_path" "$(id -un)" 2>/dev/null \
      || chsh -s "$shell_path" 2>/dev/null \
      || run_root chsh -s "$shell_path" "$(id -un)"; then
      return 0
    fi
  fi
  warn "could not change the login shell; run: chsh -s $shell_path"
}

# ---------------------------------------------------------------------------
# Verification
# ---------------------------------------------------------------------------

check_cmds() {
  local missing=0 cmd
  for cmd in "$@"; do
    if have "$cmd"; then
      log "  ok  $cmd ($(command -v "$cmd"))"
    else
      log "  MISS $cmd"
      missing=1
    fi
  done
  return "$missing"
}

verify_setup() {
  local required_failed=0 expected_failed=0
  info "required commands"
  if ! check_cmds git curl fish jq make just rg fzf go oh-my-posh micro rtk shadowtree skills-mgr git-agent gitleaks golangci-lint gopls; then
    required_failed=1
  fi
  if [ "$PM" = pacman ] && ! check_cmds yay; then
    required_failed=1
  fi
  info "expected commands"
  if ! check_cmds goimports deadcode gh zoxide delta tput gpg bun claude codex grok herdr atuin eza tldr hunk fastfetch lazygit tmux git-lfs; then
    expected_failed=1
  fi
  if [ "$required_failed" -ne 0 ]; then
    die "required tools are missing; re-run setup.sh"
  fi
  if [ "$expected_failed" -ne 0 ]; then
    warn "some expected tools are missing; re-run setup.sh after fixing package availability"
  fi
}

usage() {
  cat <<'EOF'
Usage: setup.sh

Install packages and tools for this dotfiles setup, then check the
agentic-dotfiles repository out into $HOME.

The script can be re-run after a failure. It leaves untracked files that the
repository does not own in place.
EOF
}

# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

main() {
  case "${1:-}" in
    -h|--help)
      usage
      return 0
      ;;
    "")
      ;;
    *)
      die "unknown argument: $1"
      ;;
  esac

  mkdir -p "$LOCAL_BIN" "$GOBIN" "$BACKUP_ROOT"
  cd "$HOME"

  STEP="detect package manager"
  detect_pm
  info "using $PM on $OS/$GOARCH"

  STEP="ensure brew"
  ensure_brew

  STEP="ensure sudo"
  ensure_sudo

  if [ "$PM" != apt ]; then
    STEP="refresh package index"
    refresh_pm
  fi

  STEP="ensure yay"
  ensure_yay

  STEP="install packages"
  install_packages \
    git curl jq unzip python3 ca-certificates fish make gpg ncurses \
    --optional \
    just ripgrep fzf zoxide eza delta micro gh tldr fastfetch atuin \
    lazygit tmux git-lfs wget build-essential imagemagick
  have git || die "git is required"
  have curl || die "curl is required"

  STEP="setup home git repository"
  setup_home_repo

  STEP="resolve home paths in configuration"
  rewrite_home_paths

  STEP="install latest Go"
  install_latest_go
  export PATH="${GOBIN}:${LOCAL_BIN}:${GO_PREFIX}/bin:${PATH}"
  hash -r 2>/dev/null || true

  STEP="install independent tools"
  run_independent_installs
  hash -r 2>/dev/null || true

  STEP="install tldr"
  install_tldr

  STEP="install hunkdiff"
  install_hunkdiff

  STEP="set login shell"
  ensure_fish_login_shell

  STEP="verify"
  hash -r 2>/dev/null || true
  verify_setup

  info "setup complete"
  log "open a new fish session to pick up PATH and completions"
}

main "$@"

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
LOCAL_BIN="${HOME}/.local/bin"
BACKUP_ROOT="${HOME}/.local/share/dotfiles-setup"
MISE_BIN="${LOCAL_BIN}/mise"
MISE_SHIMS="${HOME}/.local/share/mise/shims"
MISE_CONFIG="${HOME}/.config/mise/config.toml"
MISE_LOCK_PLATFORMS="linux-arm64,linux-x64,macos-arm64"
LEGACY_GO_PREFIX="${HOME}/.local/opt/go"
LEGACY_GOBIN="${HOME}/go/bin"
UPGRADE=0

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

export PATH="${MISE_SHIMS}:${LOCAL_BIN}:${HOME}/.grok/bin:${HOME}/.bun/bin:${PATH}"
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
    fish|git|curl|unzip|wget|make|imagemagick|rsync)
      printf '%s\n' "$name"
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
# Cross-platform tools managed by mise
# ---------------------------------------------------------------------------

mise_cmd() {
  "$MISE_BIN" "$@"
}

install_mise() {
  local installed=0 staged
  mkdir -p "$LOCAL_BIN"
  if [ -L "$MISE_BIN" ] || [ ! -x "$MISE_BIN" ]; then
    [ ! -L "$MISE_BIN" ] || info "replacing legacy mise link $MISE_BIN"
    info "installing mise"
    (
      staged="$(mktemp "${MISE_BIN}.setup.XXXXXX")"
      trap 'rm -f "$staged"' EXIT HUP INT TERM
      if ! curl -fsSL https://mise.run | MISE_INSTALL_PATH="$staged" sh; then
        die "mise installer failed; existing $MISE_BIN was preserved"
      fi
      "$staged" --version >/dev/null 2>&1 \
        || die "downloaded mise failed validation; existing $MISE_BIN was preserved"
      mv -f "$staged" "$MISE_BIN"
      trap - EXIT HUP INT TERM
    ) || return $?
    installed=1
  fi
  if [ "$UPGRADE" -eq 1 ] && [ "$installed" -eq 0 ]; then
    info "updating mise"
    mise_cmd self-update -y
  fi
  [ -x "$MISE_BIN" ] || die "mise is not available at $MISE_BIN"
  [ -f "$MISE_CONFIG" ] || die "mise configuration is missing: $MISE_CONFIG"
  export PATH="${MISE_SHIMS}:${LOCAL_BIN}:${HOME}/.grok/bin:${HOME}/.bun/bin:${PATH}"
}

# tool identifier | primary command
mise_tool_records() {
  cat <<'EOF'
go|go
bun|bun
aqua:astral-sh/uv|uv
github:atuinsh/atuin|atuin
aqua:crate-ci/typos|typos
aqua:dandavison/delta|delta
github:eza-community/eza|eza
aqua:fastfetch-cli/fastfetch|fastfetch
aqua:junegunn/fzf|fzf
aqua:cli/cli|gh
aqua:git-lfs/git-lfs|git-lfs
aqua:gitleaks/gitleaks|gitleaks
aqua:golangci/golangci-lint|golangci-lint
aqua:jqlang/jq|jq
aqua:casey/just|just
aqua:koalaman/shellcheck|shellcheck
aqua:jesseduffield/lazygit|lazygit
aqua:mikefarah/yq|yq
aqua:micro-editor/micro|micro
aqua:mvdan/sh|shfmt
aqua:JanDeDobbeleer/oh-my-posh|oh-my-posh
aqua:rclone/rclone|rclone
aqua:rhysd/actionlint|actionlint
aqua:BurntSushi/ripgrep|rg
aqua:rtk-ai/rtk|rtk
aqua:sharkdp/bat|bat
aqua:sharkdp/hyperfine|hyperfine
github:tldr-pages/tlrc|tldr
aqua:tmux/tmux-builds|tmux
aqua:watchexec/watchexec|watchexec
aqua:ajeetdsouza/zoxide|zoxide
go:golang.org/x/tools/gopls|gopls
go:golang.org/x/tools/cmd/goimports|goimports
go:golang.org/x/tools/cmd/deadcode|deadcode
go:github.com/yusing/skills-mgr|skills-mgr
go:github.com/yusing/git-agent/cmd/git-agent|git-agent
go:github.com/yusing/shadowtree/cmd/shadowtree|shadowtree
EOF
}

validate_mise_tool() {
  local tool="$1" cmd="$2" path
  path="$(mise_cmd which "$cmd" 2>/dev/null || true)"
  [ -n "$path" ] && [ -x "$path" ] \
    || die "mise installed $tool, but $cmd is unavailable"
}

install_locked_mise_tools() {
  local tool cmd
  info "installing the locked Go toolchain"
  mise_cmd install --locked go
  validate_mise_tool go go
  info "reconciling the locked tool set in parallel"
  mise_cmd install --locked
  while IFS='|' read -r tool cmd; do
    validate_mise_tool "$tool" "$cmd"
  done < <(mise_tool_records)
  mise_cmd reshim
}

validate_mise_lock() {
  local config_path="$1" lock_path="$2"
  MISE_CONFIG_PATH="$config_path" MISE_LOCK_PATH="$lock_path" \
    MISE_LOCK_PLATFORMS="$MISE_LOCK_PLATFORMS" py <<'PY'
import os
import re
from pathlib import Path
from urllib.parse import urlsplit

config_text = Path(os.environ["MISE_CONFIG_PATH"]).read_text()
lock_text = Path(os.environ["MISE_LOCK_PATH"]).read_text()
tools_section = config_text.split("[tools]", 1)[1]
tools_section = tools_section.split("\n[", 1)[0]
configured = {
    quoted or bare
    for quoted, bare in re.findall(r'^(?:"([^"]+)"|([A-Za-z0-9_-]+))\s*=', tools_section, re.MULTILINE)
}
locked = {
    quoted or bare
    for quoted, bare in re.findall(
        r'^\[\[tools\.(?:"([^"]+)"|([A-Za-z0-9_-]+))\]\]$',
        lock_text,
        re.MULTILINE,
    )
}
if locked != configured:
    missing = sorted(configured - locked)
    extra = sorted(locked - configured)
    raise SystemExit(f"mise lock inventory mismatch; missing={missing}, extra={extra}")

required = {f"platforms.{platform}" for platform in os.environ["MISE_LOCK_PLATFORMS"].split(",")}
artifact_header = re.compile(
    r'^\[tools\.(?:"([^"]+)"|([A-Za-z0-9_-]+))\."platforms\.([^"]+)"\]$',
    re.MULTILINE,
)
next_header = re.compile(r'^\[', re.MULTILINE)
artifacts = {}
for match in artifact_header.finditer(lock_text):
    tool = match.group(1) or match.group(2)
    platform = f"platforms.{match.group(3)}"
    following = next_header.search(lock_text, match.end())
    body = lock_text[match.end() : following.start() if following else len(lock_text)]
    fields = {
        key: value
        for key, value in re.findall(r'^(url|checksum)\s*=\s*"([^"]*)"\s*$', body, re.MULTILINE)
    }
    artifacts.setdefault((tool, platform), []).append(fields)
for tool in locked:
    # Source-built Go tools lock the module version rather than release artifacts.
    if tool.startswith("go:"):
        continue
    for platform in sorted(required):
        sections = artifacts.get((tool, platform), [])
        if len(sections) != 1:
            raise SystemExit(
                f"mise lock needs exactly one {tool} artifact for {platform}; found={len(sections)}"
            )
        url = sections[0].get("url", "")
        checksum = sections[0].get("checksum", "")
        parsed_url = urlsplit(url)
        if parsed_url.scheme != "https" or not parsed_url.hostname or parsed_url.path in {"", "/"}:
            raise SystemExit(f"mise lock has an invalid {tool} URL for {platform}")
        if not re.fullmatch(r'(?:sha256:)?[0-9a-fA-F]{64}', checksum):
            raise SystemExit(f"mise lock has an invalid {tool} checksum for {platform}")
PY
}

refresh_mise_lock() (
  local tmp lock_path staged token=""
  tmp="$(mktemp -d "${TMPDIR:-/tmp}/setup-mise-lock.XXXXXX")"
  lock_path="${MISE_CONFIG%/*}/mise.lock"
  staged="${lock_path}.setup.$$"
  trap 'rm -rf "$tmp"; rm -f "$staged"' EXIT HUP INT TERM

  mkdir -p "$tmp/.config/mise"
  cp "$MISE_CONFIG" "$tmp/.config/mise/config.toml"
  [ ! -f "$lock_path" ] || cp "$lock_path" "$tmp/.config/mise/mise.lock"

  if [ -z "${GITHUB_TOKEN:-}" ] && have gh; then
    token="$(gh auth token 2>/dev/null || true)"
    [ -z "$token" ] || export GITHUB_TOKEN="$token"
  fi

  info "updating the cross-platform tool lock"
  if ! (
    cd "$tmp"
    # Isolate the candidate config without hiding the installed Go toolchain
    # and caches that source-backed tools need while resolving versions.
    MISE_GLOBAL_CONFIG_FILE="$tmp/.config/mise/config.toml" \
      MISE_HTTP_TIMEOUT=120 MISE_FETCH_REMOTE_VERSIONS_TIMEOUT=120 \
      mise_cmd lock --global --bump \
      --platform "$MISE_LOCK_PLATFORMS"
  ) 2>&1 | tee "$tmp/mise-lock.log"; then
    return 1
  fi
  if grep -Eq '^mise WARN[[:space:]]+(Failed to resolve tool version list|Remote versions cannot be fetched|Error getting latest version)' \
    "$tmp/mise-lock.log"; then
    warn "mise could not resolve every latest tool version; the existing lock was preserved"
    return 1
  fi
  validate_mise_lock "$tmp/.config/mise/config.toml" "$tmp/.config/mise/mise.lock" \
    || return 1
  cp "$tmp/.config/mise/mise.lock" "$staged"
  mv "$staged" "$lock_path"
)

upgrade_mise_tools() {
  # The existing locked Go version is needed to resolve source-built Go tools.
  mise_cmd install --locked go
  refresh_mise_lock
  install_locked_mise_tools
}

# ---------------------------------------------------------------------------
# Legacy source cleanup
# ---------------------------------------------------------------------------

legacy_packages() {
  local cmd="$1"
  case "${PM}:${cmd}" in
    brew:actionlint) echo actionlint ;;
    brew:atuin) echo atuin ;;
    brew:bat) echo bat ;;
    brew:bun) echo bun ;;
    brew:codex) echo codex ;;
    brew:delta) echo git-delta ;;
    brew:eza) echo eza ;;
    brew:fastfetch) echo fastfetch ;;
    brew:fzf) echo fzf ;;
    brew:gh) echo gh ;;
    brew:git-lfs) echo git-lfs ;;
    brew:gitleaks) echo gitleaks ;;
    brew:go) echo go ;;
    brew:golangci-lint) echo golangci-lint ;;
    brew:herdr) echo herdr ;;
    brew:hyperfine) echo hyperfine ;;
    brew:jq) echo jq ;;
    brew:just) echo just ;;
    brew:lazygit) echo lazygit ;;
    brew:micro) echo micro ;;
    brew:mise) echo mise ;;
    brew:oh-my-posh) echo oh-my-posh ;;
    brew:rg) echo ripgrep ;;
    brew:rtk) echo rtk ;;
    brew:rclone) echo rclone ;;
    brew:shellcheck) echo shellcheck ;;
    brew:shfmt) echo shfmt ;;
    brew:tldr) echo tealdeer ;;
    brew:tmux) echo tmux ;;
    brew:typos) echo typos-cli ;;
    brew:uv) echo uv ;;
    brew:watchexec) echo watchexec ;;
    brew:yq) echo yq ;;
    brew:zoxide) echo zoxide ;;

    apt:actionlint) echo actionlint ;;
    apt:atuin) echo atuin ;;
    apt:bat) echo bat ;;
    apt:delta) echo git-delta ;;
    apt:eza) echo eza ;;
    apt:fastfetch) echo fastfetch ;;
    apt:fzf) echo fzf ;;
    apt:gh) echo gh ;;
    apt:git-lfs) echo git-lfs ;;
    apt:gitleaks) echo gitleaks ;;
    apt:go) printf '%s\n' golang-go golang ;;
    apt:golangci-lint) echo golangci-lint ;;
    apt:hyperfine) echo hyperfine ;;
    apt:jq) echo jq ;;
    apt:just) echo just ;;
    apt:lazygit) echo lazygit ;;
    apt:micro) echo micro ;;
    apt:mise) echo mise ;;
    apt:oh-my-posh) echo oh-my-posh ;;
    apt:rg) echo ripgrep ;;
    apt:rclone) echo rclone ;;
    apt:shellcheck) echo shellcheck ;;
    apt:shfmt) echo shfmt ;;
    apt:tldr) printf '%s\n' tealdeer tldr ;;
    apt:tmux) echo tmux ;;
    apt:typos) echo typos-cli ;;
    apt:uv) echo uv ;;
    apt:watchexec) echo watchexec ;;
    apt:yq) echo yq ;;
    apt:zoxide) echo zoxide ;;

    pacman:actionlint) echo actionlint ;;
    pacman:atuin) echo atuin ;;
    pacman:bat) echo bat ;;
    pacman:bun) printf '%s\n' bun bun-bin ;;
    pacman:codex) printf '%s\n' codex codex-cli-bin ;;
    pacman:delta) echo git-delta ;;
    pacman:eza) echo eza ;;
    pacman:fastfetch) echo fastfetch ;;
    pacman:fzf) echo fzf ;;
    pacman:gh) echo github-cli ;;
    pacman:git-lfs) echo git-lfs ;;
    pacman:gitleaks) echo gitleaks ;;
    pacman:go) echo go ;;
    pacman:golangci-lint) echo golangci-lint ;;
    pacman:hyperfine) echo hyperfine ;;
    pacman:jq) echo jq ;;
    pacman:just) echo just ;;
    pacman:lazygit) echo lazygit ;;
    pacman:micro) echo micro ;;
    pacman:mise) echo mise ;;
    pacman:oh-my-posh) echo oh-my-posh ;;
    pacman:rg) echo ripgrep ;;
    pacman:rtk) echo rtk ;;
    pacman:rclone) echo rclone ;;
    pacman:shellcheck) echo shellcheck ;;
    pacman:shfmt) echo shfmt ;;
    pacman:tldr) echo tealdeer ;;
    pacman:tmux) echo tmux ;;
    pacman:typos) echo typos-cli ;;
    pacman:uv) echo uv ;;
    pacman:watchexec) echo watchexec ;;
    pacman:yq) echo yq ;;
    pacman:zoxide) echo zoxide ;;
  esac
}

installed_pm_package() {
  case "$PM" in
    apt)
      dpkg-query -W -f='${Status}\n' "$1" 2>/dev/null \
        | grep -q 'install ok installed' \
        && printf '%s\n' "$1"
      ;;
    brew)
      brew list --formula "$1" >/dev/null 2>&1 \
        && printf '%s\n' "$1"
      ;;
    pacman)
      pacman -Qq "$1" 2>/dev/null
      ;;
  esac
}

remove_legacy_packages() {
  local pkg resolved existing duplicate dependents plan removed name matched
  local candidates=() removable=()
  for pkg in "$@"; do
    [ -n "$pkg" ] || continue
    resolved="$(installed_pm_package "$pkg")" || continue
    pkg="$resolved"
    duplicate=0
    for existing in "${candidates[@]}"; do
      [ "$existing" != "$pkg" ] || duplicate=1
    done
    [ "$duplicate" -eq 1 ] || candidates+=("$pkg")
  done
  [ "${#candidates[@]}" -gt 0 ] || return 0

  case "$PM" in
    brew)
      for pkg in "${candidates[@]}"; do
        dependents="$(brew uses --installed "$pkg" 2>/dev/null || true)"
        if [ -n "$dependents" ]; then
          warn "keeping legacy brew package $pkg; used by: $dependents"
        else
          removable+=("$pkg")
        fi
      done
      [ "${#removable[@]}" -gt 0 ] || return 0
      info "removing legacy brew packages: ${removable[*]}"
      brew uninstall --formula "${removable[@]}"
      ;;
    apt)
      plan="$(apt-get -s remove "${candidates[@]}")" \
        || { warn "keeping legacy apt packages; removal simulation failed"; return 0; }
      removed="$(printf '%s\n' "$plan" | awk '$1 == "Remv" { print $2 }')"
      for name in $removed; do
        matched=0
        for pkg in "${candidates[@]}"; do
          [ "${name%%:*}" != "$pkg" ] || matched=1
        done
        if [ "$matched" -eq 0 ]; then
          warn "keeping legacy apt packages; removal would also remove $name"
          return 0
        fi
      done
      for pkg in "${candidates[@]}"; do
        matched=0
        for name in $removed; do
          [ "${name%%:*}" != "$pkg" ] || matched=1
        done
        if [ "$matched" -eq 0 ]; then
          warn "keeping legacy apt packages; simulation did not confirm removal of $pkg"
          return 0
        fi
      done
      info "removing legacy apt packages: ${candidates[*]}"
      run_root apt-get remove -y "${candidates[@]}"
      ;;
    pacman)
      info "removing legacy pacman packages: ${candidates[*]}"
      if ! run_root pacman -R --noconfirm "${candidates[@]}"; then
        warn "keeping legacy pacman packages; one or more may still be required"
      fi
      ;;
  esac
}

remove_legacy_file() {
  local path="$1" replacement="$2" path_real replacement_real
  if [ ! -e "$path" ] && [ ! -L "$path" ]; then
    return 0
  fi
  if [ -n "$replacement" ] && [ -e "$replacement" ]; then
    path_real="$(realpath "$path" 2>/dev/null || true)"
    replacement_real="$(realpath "$replacement" 2>/dev/null || true)"
    if [ -n "$path_real" ] && [ "$path_real" = "$replacement_real" ]; then
      return 0
    fi
  fi
  info "removing legacy tool path $path"
  rm -f "$path"
}

cleanup_legacy_files() {
  local cmd="$1" replacement
  replacement="$(mise_cmd which "$cmd" 2>/dev/null || true)"
  case "$cmd" in
    atuin)
      remove_legacy_file "${HOME}/.atuin/bin/atuin" "$replacement"
      remove_legacy_file "${LOCAL_BIN}/atuin" "$replacement"
      ;;
    bun) remove_legacy_file "${HOME}/.bun/bin/bun" "$replacement" ;;
    fzf)
      remove_legacy_file "${LOCAL_BIN}/fzf" "$replacement"
      remove_legacy_file "${HOME}/.fzf/bin/fzf" "$replacement"
      if [ -d "${HOME}/.fzf/.git" ] \
        && git -C "${HOME}/.fzf" remote get-url origin 2>/dev/null | grep -q 'junegunn/fzf'; then
        info "removing legacy fzf checkout ${HOME}/.fzf"
        rm -rf "${HOME}/.fzf"
      fi
      ;;
    go)
      remove_legacy_file "${LOCAL_BIN}/go" "$replacement"
      remove_legacy_file "${LOCAL_BIN}/gofmt" "$(mise_cmd which gofmt 2>/dev/null || true)"
      if [ -x "${LEGACY_GO_PREFIX}/bin/go" ]; then
        info "removing legacy Go toolchain $LEGACY_GO_PREFIX"
        rm -rf "$LEGACY_GO_PREFIX"
      fi
      ;;
    gopls|goimports|deadcode|skills-mgr|git-agent|shadowtree)
      remove_legacy_file "${LEGACY_GOBIN}/${cmd}" "$replacement"
      remove_legacy_file "${LOCAL_BIN}/${cmd}" "$replacement"
      ;;
    gitleaks|golangci-lint|lazygit)
      remove_legacy_file "${LEGACY_GOBIN}/${cmd}" "$replacement"
      remove_legacy_file "${LOCAL_BIN}/${cmd}" "$replacement"
      ;;
    actionlint|bat|codex|delta|eza|fastfetch|gh|git-lfs|hyperfine|jq|just|micro|oh-my-posh|rclone|rg|rtk|shellcheck|shfmt|tldr|tmux|typos|watchexec|yq|zoxide)
      remove_legacy_file "${LOCAL_BIN}/${cmd}" "$replacement"
      [ "$cmd" != tldr ] || remove_legacy_file "${HOME}/.bun/bin/tldr" "$replacement"
      ;;
    uv)
      remove_legacy_file "${LOCAL_BIN}/uv" "$replacement"
      remove_legacy_file "${LOCAL_BIN}/uvx" "$(mise_cmd which uvx 2>/dev/null || true)"
      ;;
  esac
}

cleanup_legacy_tool_sources() {
  local tool cmd pkg
  local packages=()
  info "reconciling tool ownership"
  while IFS= read -r pkg; do
    [ -z "$pkg" ] || packages+=("$pkg")
  done < <(legacy_packages mise)
  while IFS='|' read -r tool cmd; do
    validate_mise_tool "$tool" "$cmd"
    while IFS= read -r pkg; do
      [ -z "$pkg" ] || packages+=("$pkg")
    done < <(legacy_packages "$cmd")
  done < <(mise_tool_records)
  remove_legacy_packages "${packages[@]}"
  while IFS='|' read -r tool cmd; do
    cleanup_legacy_files "$cmd"
    validate_mise_tool "$tool" "$cmd"
  done < <(mise_tool_records)
  hash -r 2>/dev/null || true
}

# ---------------------------------------------------------------------------
# Additional tools
# ---------------------------------------------------------------------------

install_claude() {
  if [ ! -x "${LOCAL_BIN}/claude" ]; then
    info "installing Claude Code"
    curl -fsSL https://claude.ai/install.sh | bash
  elif [ "$UPGRADE" -eq 1 ]; then
    info "updating Claude Code"
    "${LOCAL_BIN}/claude" update
  fi
}

install_codex() {
  local pkg
  local packages=()
  if [ ! -x "${LOCAL_BIN}/codex" ] || [ "$UPGRADE" -eq 1 ]; then
    info "installing/updating Codex"
    curl -fsSL https://chatgpt.com/codex/install.sh | CODEX_NON_INTERACTIVE=1 sh
  fi
  [ -x "${LOCAL_BIN}/codex" ] || die "Codex is unavailable at ${LOCAL_BIN}/codex"

  # Codex moved back to its official installer; remove both mise backends used
  # by earlier setup versions so their generated shim cannot shadow it.
  mise_cmd uninstall --all aqua:openai/codex github:openai/codex >/dev/null 2>&1 \
    || warn "could not remove a legacy mise-managed Codex installation"
  mise_cmd reshim
  while IFS= read -r pkg; do
    [ -z "$pkg" ] || packages+=("$pkg")
  done < <(legacy_packages codex)
  remove_legacy_packages "${packages[@]}"
}

install_grok() {
  local grok_bin="${HOME}/.grok/bin/grok"
  if [ ! -x "$grok_bin" ]; then
    info "installing Grok CLI"
    curl -fsSL https://x.ai/cli/install.sh | bash
  elif [ "$UPGRADE" -eq 1 ]; then
    info "updating Grok CLI"
    "$grok_bin" update
  fi
}

install_herdr() {
  local pkg
  local packages=()
  if [ ! -x "${LOCAL_BIN}/herdr" ] || [ "$UPGRADE" -eq 1 ]; then
    info "installing/updating herdr"
    curl -fsSL https://herdr.dev/install.sh | sh
  fi
  [ -x "${LOCAL_BIN}/herdr" ] || die "herdr is unavailable at ${LOCAL_BIN}/herdr"
  while IFS= read -r pkg; do
    [ -z "$pkg" ] || packages+=("$pkg")
  done < <(legacy_packages herdr)
  remove_legacy_packages "${packages[@]}"
}

install_hunkdiff() {
  if [ ! -x "${HOME}/.bun/bin/hunk" ] || [ "$UPGRADE" -eq 1 ]; then
    info "installing/updating hunkdiff"
    bun install -g hunkdiff@latest
  fi
}

run_additional_installs() (
  local log_root index log status failed=0
  local labels=("Claude Code" "Codex" "Grok CLI" "herdr" "hunkdiff")
  local commands=(install_claude install_codex install_grok install_herdr install_hunkdiff)
  local pids=() logs=()

  log_root="$(mktemp -d "${TMPDIR:-/tmp}/setup-vendor.XXXXXX")"
  trap 'rm -rf "$log_root"' EXIT HUP INT TERM

  for ((index = 0; index < ${#commands[@]}; index++)); do
    log="${log_root}/${index}.log"
    logs[index]="$log"
    info "starting ${labels[$index]}"
    (STEP="install ${labels[$index]}"; "${commands[$index]}") >"$log" 2>&1 &
    pids[index]=$!
  done

  for ((index = 0; index < ${#pids[@]}; index++)); do
    if wait "${pids[$index]}"; then status=0; else status=$?; failed=1; fi
    info "install log: ${labels[$index]}"
    if [ -s "${logs[$index]}" ]; then cat "${logs[$index]}"; else log "  completed with no output"; fi
    [ "$status" -eq 0 ] || warn "${labels[$index]} install failed with status $status"
  done

  [ "$failed" -eq 0 ] || die "one or more additional tool installs failed"
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
  local required_failed=0 tool cmd path
  info "native commands"
  if ! check_cmds git curl fish make tput gpg python3 unzip rsync; then required_failed=1; fi
  if [ "$PM" = pacman ] && ! check_cmds yay; then
    required_failed=1
  fi
  info "mise-managed commands"
  while IFS='|' read -r tool cmd; do
    path="$(mise_cmd which "$cmd" 2>/dev/null || true)"
    if [ -n "$path" ] && [ -x "$path" ]; then
      log "  ok  $cmd ($path)"
    else
      log "  MISS $cmd ($tool)"
      required_failed=1
    fi
  done < <(mise_tool_records)
  info "additional commands"
  if ! check_cmds claude grok herdr hunk; then required_failed=1; fi
  if [ "$required_failed" -ne 0 ]; then
    die "required tools are missing; re-run setup.sh"
  fi
}

usage() {
  cat <<'EOF'
Usage: setup.sh [--upgrade]

Install missing native and locked cross-platform tools, reconcile each tool to
its declared owner, then check the agentic-dotfiles repository out into $HOME.

Without --upgrade, installed tools are reconciled to the tracked lock without a
remote version lookup. Packages from legacy Brew, APT, Pacman, and direct-install
sources are removed only after the replacement validates. --upgrade advances the
tracked multi-platform mise lock and installs it. Native OS package upgrades
remain separate.
EOF
}

# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

main() {
  [ "$#" -le 1 ] || die "expected at most one argument"
  case "${1:-}" in
    -h|--help)
      usage
      return 0
      ;;
    "")
      ;;
    --upgrade)
      UPGRADE=1
      ;;
    *)
      die "unknown argument: $1"
      ;;
  esac

  mkdir -p "$LOCAL_BIN" "$BACKUP_ROOT"
  cd "$HOME"

  STEP="detect package manager"
  detect_pm
  info "using $PM on $OS/$GOARCH"

  STEP="ensure brew"
  ensure_brew

  STEP="ensure sudo"
  ensure_sudo

  STEP="ensure yay"
  ensure_yay

  STEP="install packages"
  install_packages \
    git curl unzip python3 ca-certificates fish make gpg ncurses rsync \
    --optional \
    wget build-essential imagemagick
  have git || die "git is required"
  have curl || die "curl is required"

  STEP="setup home git repository"
  setup_home_repo

  STEP="resolve home paths in configuration"
  rewrite_home_paths

  STEP="install mise"
  install_mise

  STEP="install cross-platform tools"
  if [ "$UPGRADE" -eq 1 ]; then
    upgrade_mise_tools
  else
    install_locked_mise_tools
  fi

  STEP="reconcile tool ownership"
  cleanup_legacy_tool_sources

  STEP="install additional tools"
  run_additional_installs

  STEP="set login shell"
  ensure_fish_login_shell

  STEP="verify"
  hash -r 2>/dev/null || true
  verify_setup

  info "cross-platform tool versions"
  mise_cmd ls --global

  info "setup complete"
  log "open a new shell session to activate the mise-managed tools"
}

main "$@"

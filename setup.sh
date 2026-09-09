#!/bin/bash
# version: 2.2.6
# Bootstrap this home directory as a checkout of yusing/agentic-dotfiles and
# install the packages and tools the shell configuration expects.
#
# Existing home repositories with a commit at HEAD skip Git setup.
# Safe to re-run tool installation after a mid-flight failure. Unrelated files in $HOME
# are left in place. Files that would be overwritten by the checkout are copied
# to ~/.local/share/dotfiles-setup/ first.

set -euo pipefail

REPO_URL="https://github.com/yusing/agentic-dotfiles.git"
REPO_SLUG="yusing/agentic-dotfiles"
GIT_NAME="yusing"
GIT_EMAIL="yusing.wys@gmail.com"
LOCAL_BIN="${HOME}/.local/bin"
BACKUP_ROOT="${HOME}/.local/share/dotfiles-setup"
MISE_BIN="${LOCAL_BIN}/mise"
MISE_SHIMS="${HOME}/.local/share/mise/shims"
MISE_CONFIG="${MISE_CONFIG:-${HOME}/.config/mise/config.toml}"
MISE_LOCK_PLATFORMS="linux-arm64,linux-x64,macos-arm64"
LLVM_BREW_FORMULA_API="https://formulae.brew.sh/api/formula/llvm.json"
UPGRADE=0
SETUP_CONFIG_EXPLICIT="${SETUP_CONFIG:+1}"
SETUP_CONFIG="${SETUP_CONFIG:-$(cd "$(dirname "${BASH_SOURCE[0]:-$HOME/setup.sh}")" && pwd)/setup.json}"

STEP="starting"
trap 'printf "setup.sh failed during: %s\n" "$STEP" >&2' ERR

log() { printf '%s\n' "$*"; }
info() { printf '==> %s\n' "$*"; }
warn() { printf 'warning: %s\n' "$*" >&2; }
die() { printf 'error: %s\n' "$*" >&2; exit 1; }

have() { command -v "$1" >/dev/null 2>&1; }

# in_list NEEDLE [ITEM...]
# Empty arrays must be expanded as ${arr[@]+"${arr[@]}"} so bash 3.2 `set -u`
# does not treat "${arr[@]}" as unbound.
in_list() {
  local needle="$1" item
  shift
  for item in "$@"; do
    [ "$item" != "$needle" ] || return 0
  done
  return 1
}

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

load_brew_llvm_env() {
  local prefix
  [ "$PM" = brew ] || return 0
  have brew || return 0
  prefix="$(brew --prefix llvm 2>/dev/null || true)"
  [ -n "$prefix" ] && [ -d "$prefix/bin" ] || return 0
  export PATH="${prefix}/bin:${PATH}"
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
mapped_pkgs() { setup_config native-packages "$1"; }
pkg_cmd() { setup_config native-command "$1"; }

have_logical() {
  local name="$1" cmd prefix commands
  setup_config native-enabled "$name" || return 1
  prefix="$(setup_config native-prefix "$name")" || return 1
  if [ "$PM" = brew ] && [ -n "$prefix" ]; then
    prefix="$(brew --prefix "$prefix" 2>/dev/null || true)"
    cmd="$(pkg_cmd "$name")"
    [ -n "$prefix" ] && [ -x "$prefix/bin/$cmd" ]
    return
  fi
  commands="$(setup_config native-commands "$name")" || return 1
  if [ -z "$commands" ]; then
    # No executable probe: ask the package manager rather than assuming success.
    commands="$(mapped_pkgs "$name")" || return 1
    while IFS= read -r cmd; do
      case "$PM" in
        apt) if dpkg-query -W -f='${Status}\n' "$cmd" 2>/dev/null | grep -q 'install ok installed'; then return 0; fi ;;
        brew) if installed_pm_package "$cmd" >/dev/null; then return 0; fi ;;
        pacman) if pacman -Q "$cmd" >/dev/null 2>&1; then return 0; fi ;;
      esac
    done <<<"$commands"
    return 1
  fi
  while IFS= read -r cmd; do
    have "$cmd" && return 0
  done <<<"$commands"
  return 1
}

py() {
  if [ -n "${SETUP_PYTHON:-}" ]; then
    "$SETUP_PYTHON" "$@"
  elif have python3; then
    python3 "$@"
  elif have python; then
    python "$@"
  else
    die "python3 is required"
  fi
}

ensure_toml_parser() {
  local check=$'try:\n import tomllib\nexcept ImportError:\n import tomli'
  py -c "$check" >/dev/null 2>&1 && return 0
  info "installing Python TOML support"
  case "$PM" in
    apt) refresh_pm; pm_install_batch python3-tomli ;;
    pacman) pm_install_batch python-tomli ;;
    brew)
      pm_install_batch python
      SETUP_PYTHON="$(brew --prefix python)/bin/python3"
      ;;
  esac
  py -c "$check" >/dev/null 2>&1 \
    || die "Python TOML support is unavailable; use Python 3.11+ or install tomli for the active Python"
}

# JSON values travel as data, never as shell source. Validate before emitting any
# records so malformed config cannot turn into a partial install plan.
setup_config() {
  SETUP_PM="$PM" SETUP_OS="$OS" \
    py - "$SETUP_CONFIG" "$@" <<'PY'
import json
import math
import os
import re
import sys
from pathlib import Path

def require(ok, message):
    if not ok:
        raise ValueError(message)

def obj(value, allowed, where):
    require(isinstance(value, dict), f"{where} must be an object")
    require(not (set(value) - set(allowed)), f"unknown field in {where}: {set(value) - set(allowed)}")

def string(value):
    require(isinstance(value, str) and value and not any(c in value for c in "\n\r\0|"), "expected a nonempty, single-line string without |")

def strings(value):
    require(isinstance(value, list), "expected an array")
    for item in value:
        string(item)

def relative(value):
    string(value)
    require(not value.startswith(("/", "-")) and all(p not in {"", ".", ".."} for p in value.split("/")), "paths must be relative to HOME without . or .. components")

def packages(value):
    obj(value, ("apt", "brew", "pacman"), "packages")
    for items in value.values():
        strings(items)
        require(all(not x.startswith("-") and not any(c.isspace() for c in x) for x in items), "invalid package name")

def unique_object(pairs):
    result = {}
    for key, value in pairs:
        require(key not in result, f"duplicate JSON key: {key}")
        result[key] = value
    return result

try:
    config = json.loads(Path(sys.argv[1]).read_text(), object_pairs_hook=unique_object)
    obj(config, ("version", "native", "mise", "mise_commands", "vendors", "legacy"), "setup")
    require(type(config.get("version")) is int and config["version"] == 2, "unsupported setup config version")
    for section in ("native", "mise_commands", "vendors", "legacy"):
        require(isinstance(config.get(section), dict), f"{section} must be an object")
        for name in config[section]:
            string(name)
            require(not name.startswith("-"), "names must not start with -")
    for entry in config["native"].values():
        obj(entry, ("packages", "commands", "optional", "brew_prefix"), "native package")
        packages(entry.get("packages"))
        strings(entry.get("commands", []))
        require(type(entry.get("optional", False)) is bool, "optional must be boolean")
        if "brew_prefix" in entry:
            string(entry["brew_prefix"])
    for command in config["mise_commands"].values():
        string(command)
    obj(config.get("mise"), ("settings", "tools"), "mise")
    require(isinstance(config["mise"].get("settings", {}), dict), "mise.settings must be an object")
    require(isinstance(config["mise"].get("tools"), dict), "mise.tools must be an object")
    for tool, declaration in config["mise"]["tools"].items():
        string(tool)
        require(not tool.startswith("-"), "invalid mise tool name")
        require(isinstance(declaration, (str, dict)), "mise tool must be a version string or options object")
        string(declaration if isinstance(declaration, str) else declaration.get("version"))

    def toml(value):
        if isinstance(value, str):
            return json.dumps(value, ensure_ascii=False)
        if type(value) is bool:
            return "true" if value else "false"
        if type(value) is int:
            return str(value)
        if type(value) is float:
            require(math.isfinite(value), "non-finite TOML number")
            return str(value)
        if isinstance(value, list):
            return "[" + ", ".join(toml(item) for item in value) + "]"
        if isinstance(value, dict):
            return "{ " + ", ".join(json.dumps(key) + " = " + toml(item) for key, item in value.items()) + " }"
        raise ValueError("mise values must be TOML-compatible: null is not supported")

    def render_mise(data):
        result = "# Generated by setup.sh from setup.json. Edit setup.json, not this file.\n"
        for section in ("settings", "tools"):
            result += f"\n[{section}]\n"
            for key, value in data.get(section, {}).items():
                result += json.dumps(key) + " = " + toml(value) + "\n"
        return result

    rendered = render_mise(config["mise"])

    def lock_matches(tool, declaration, entry):
        selector = declaration["version"] if isinstance(declaration, dict) else declaration
        if selector not in entry.get("specifiers", []):
            return False
        # Qualified identifiers declare their backend. Bare aliases deliberately
        # leave backend selection to mise's registry and the lock itself.
        if ":" in tool and entry.get("backend") not in (None, tool):
            return False
        # npm preserves complete semver pins exactly. Other providers may
        # normalize or expand numeric selectors, so mise owns their exactness.
        if tool.startswith("npm:") and re.fullmatch(r"\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?", selector):
            if entry.get("version") != selector:
                return False
        return True
    for entry in config["vendors"].values():
        obj(entry, ("label", "path", "url", "shell", "update", "env", "legacy_mise"), "vendor")
        for field in ("label", "url", "shell"):
            string(entry.get(field))
        relative(entry.get("path"))
        require(entry["url"].startswith("https://"), "vendor URL must use HTTPS")
        require(entry["shell"] in ("sh", "bash"), "vendor shell must be sh or bash")
        strings(entry.get("update", []))
        strings(entry.get("legacy_mise", []))
        require(all(not x.startswith("-") for x in entry.get("legacy_mise", [])), "invalid legacy mise tool")
        require(isinstance(entry.get("env", {}), dict), "vendor env must be an object")
        for key, value in entry.get("env", {}).items():
            require(re.fullmatch(r"[A-Za-z_][A-Za-z0-9_]*", key), "invalid environment variable name")
            string(value)
    for entry in config["legacy"].values():
        obj(entry, ("packages", "bun", "files", "directories"), "legacy entry")
        packages(entry.get("packages", {}))
        if "bun" in entry:
            string(entry["bun"])
            require(not entry["bun"].startswith("-"), "invalid legacy bun package")
        for field in ("files", "directories"):
            require(isinstance(entry.get(field, []), list), f"{field} must be an array")
        for item in entry.get("files", []):
            obj(item, ("path", "command"), "legacy file")
            relative(item.get("path"))
            string(item.get("command"))
        for item in entry.get("directories", []):
            obj(item, ("path", "executable", "origin_contains"), "legacy directory")
            relative(item.get("path"))
            require(item["path"] not in {".local", ".local/bin", ".local/share", ".local/opt", ".config", "go", "go/bin", ".bun", ".bun/bin"}, "legacy directory is too broad")
            require(("executable" in item) != ("origin_contains" in item), "legacy directory needs exactly one ownership probe")
            if "executable" in item:
                relative(item["executable"])
            else:
                string(item["origin_contains"])

    action = sys.argv[2]
    name = sys.argv[3] if len(sys.argv) > 3 else ""
    pm = os.environ["SETUP_PM"]
    platform = {"Darwin": "macos", "Linux": "linux"}.get(os.environ["SETUP_OS"])
    output = []
    if action == "validate":
        pass
    elif action.startswith("native-"):
        if action in ("native-required", "native-optional"):
            output = [key for key, entry in config["native"].items()
                      if entry["packages"].get(pm, []) and entry.get("optional", False) == (action == "native-optional")]
        elif action == "native-enabled":
            sys.exit(0 if config["native"].get(name, {}).get("packages", {}).get(pm) else 1)
        else:
            entry = config["native"][name]
            if action == "native-packages":
                output = entry["packages"].get(pm, [])
            elif action == "native-command":
                output = entry.get("commands", [])[:1]
            elif action == "native-commands":
                output = entry.get("commands", [])
            elif action == "native-prefix":
                output = [entry.get("brew_prefix", "")]
            else:
                raise ValueError(f"unknown action: {action}")
    elif action == "mise-render":
        sys.stdout.write(rendered)
        sys.exit(0)
    elif action in ("mise-plan", "mise-verify-lock"):
        try:
            import tomllib
        except ImportError:
            import tomli as tomllib
        root = Path(name)
        def read_toml(path):
            return tomllib.loads(path.read_text()) if path.exists() else {}
        previous = read_toml(root / "previous.toml")
        old_lock = read_toml(root / "previous.lock")
        old_tools = old_lock.get("tools", {})
        if action == "mise-verify-lock":
            retained = json.loads((root / "retained.json").read_text())
            updated = read_toml(root / ".config/mise/mise.lock").get("tools", {})
            desired = read_toml(root / "desired.toml").get("tools", {})
            for tool, declaration in desired.items():
                entries = updated.get(tool, [])
                require(len(entries) == 1 and lock_matches(tool, declaration, entries[0]),
                        f"lock entry does not match declaration: {tool}")
            for tool in retained:
                require(updated.get(tool) == old_tools[tool], f"lock refresh unexpectedly changed retained tool: {tool}")
        else:
            desired = read_toml(root / "desired.toml")
            tools = desired.get("tools", {})
            changed = {
                tool for tool, value in tools.items()
                if sys.argv[4] == "1" or previous.get("tools", {}).get(tool) != value
                or len(old_tools.get(tool, [])) != 1
                or not lock_matches(tool, value, old_tools[tool][0])
            }
            retained = set(tools) - changed
            (root / "retained.json").write_text(json.dumps(sorted(retained)))
            # Preserve retained records verbatim; remove an entire tool record,
            # including its platform subtables, for deletions and option changes.
            old_text = (root / "previous.lock").read_text() if (root / "previous.lock").exists() else "lockfile_version = 1\n"
            headers = list(re.finditer(r"^\[\[tools\.(.+)\]\][ \t]*$", old_text, re.MULTILINE))
            pruned = old_text[:headers[0].start()] if headers else old_text
            for index, match in enumerate(headers):
                tool = next(iter(tomllib.loads(match[0])["tools"]))
                if tool in retained:
                    end = headers[index + 1].start() if index + 1 < len(headers) else len(old_text)
                    pruned += old_text[match.start():end]
            (root / ".config/mise/mise.lock").write_text(pruned)
            # Mise resolves its whole input before filtering tool arguments.
            # Pin unchanged declarations so their latest selectors do not advance.
            resolution = dict(desired)
            resolution["tools"] = dict(tools)
            for tool in retained:
                value = tools[tool]
                version = old_tools[tool][0]["version"]
                resolution["tools"][tool] = dict(value, version=version) if isinstance(value, dict) else version
            (root / ".config/mise/config.toml").write_text(render_mise(resolution))
            for os_name in ("linux", "macos"):
                selected = []
                for tool, value in tools.items():
                    platforms = value.get("os", ["linux", "macos"]) if isinstance(value, dict) else ["linux", "macos"]
                    if tool in changed and os_name in platforms:
                        selected.append(tool)
                (root / (os_name + "-tools")).write_text("".join(tool + "\n" for tool in selected))
            (root / "changed-tools").write_text("".join(tool + "\n" for tool in tools if tool in changed))
            bootstrap = []
            for runtime, backend in (("go", "go:"), ("bun", "npm:")):
                if runtime in tools and any(tool.startswith(backend) for tool in changed):
                    mode = "locked" if runtime in old_tools and runtime in previous.get("tools", {}) else "unlocked"
                    bootstrap.append(f"{runtime}|{mode}\n")
            (root / "bootstrap-tools").write_text("".join(bootstrap))
            print(f"mise lock: {len(changed)} added/changed, {len(set(old_tools) - set(tools))} removed, {len(retained)} retained")
    elif action.startswith("mise-"):
        tools = config["mise"]["tools"]
        def platforms(value):
            return value.get("os", ["linux", "macos"]) if isinstance(value, dict) else ["linux", "macos"]
        if action == "mise-records":
            for tool in tools:
                command = config["mise_commands"].get(tool, tool.rsplit(":", 1)[-1].rsplit("/", 1)[-1])
                string(tool)
                string(command)
                output.append(f"{tool}|{command}")
        elif action == "mise-applies":
            sys.exit(0 if name in tools and platform in platforms(tools[name]) else 1)
        elif action == "mise-has":
            sys.exit(0 if name in tools else 1)
        else:
            raise ValueError(f"unknown action: {action}")
    elif action == "vendors":
        output = [f"{key}|{entry['label']}" for key, entry in config["vendors"].items()]
    elif action == "vendor-field":
        value = config["vendors"][name].get(sys.argv[4], [])
        output = value if isinstance(value, list) else [value]
    elif action == "vendor-env":
        output = [f"{key}={value}" for key, value in config["vendors"][name].get("env", {}).items()]
    elif action.startswith("legacy-"):
        entry = config["legacy"].get(name, {})
        if action == "legacy-packages":
            output = entry.get("packages", {}).get(pm, [])
        elif action == "legacy-bun":
            output = [entry.get("bun", "")]
        elif action == "legacy-files":
            output = [f"{item['path']}|{item['command']}" for item in entry.get("files", [])]
        elif action == "legacy-directories":
            output = [f"{item['path']}|{item.get('executable', '')}|{item.get('origin_contains', '')}" for item in entry.get("directories", [])]
        else:
            raise ValueError(f"unknown action: {action}")
    else:
        raise ValueError(f"unknown action: {action}")
    for value in output:
        print(value)
except (ValueError, KeyError, TypeError, OSError, ImportError) as error:
    print(f"setup config: {error}", file=sys.stderr)
    sys.exit(1)
PY
}

install_configured_packages() {
  local name records
  local names=()
  records="$(setup_config native-required)" || return 1
  while IFS= read -r name; do [ -z "$name" ] || names+=("$name"); done <<<"$records"
  names+=(--optional)
  records="$(setup_config native-optional)" || return 1
  while IFS= read -r name; do [ -z "$name" ] || names+=("$name"); done <<<"$records"
  install_packages "${names[@]}"
}

# Upgrade declared installed alternatives; Arch requires a full system upgrade.
upgrade_configured_packages() {
  [ "$UPGRADE" -eq 1 ] || return 0
  if [ "$PM" = pacman ]; then
    info "upgrading the full Arch system"
    refresh_pm || return 1
    return 0
  fi
  local records optional_records name candidates pkg installed
  local packages=()
  records="$(setup_config native-required)" || return 1
  optional_records="$(setup_config native-optional)" || return 1
  records="${records}"$'\n'"${optional_records}"
  while IFS= read -r name; do
    [ -n "$name" ] || continue
    candidates="$(mapped_pkgs "$name")" || return 1
    while IFS= read -r pkg; do
      [ -n "$pkg" ] || continue
      installed="$(installed_pm_package "$pkg")" || continue
      [ -n "$installed" ] || continue
      if ! in_list "$pkg" ${packages[@]+"${packages[@]}"}; then packages+=("$pkg"); fi
      # Mappings are alternatives, not additional packages to manage.
      break
    done <<<"$candidates"
  done <<<"$records"
  [ "${#packages[@]}" -gt 0 ] || return 0
  info "upgrading setup-owned native packages: ${packages[*]}"
  case "$PM" in
    apt)
      run_root apt-get update -y || return 1
      run_root apt-get install --only-upgrade --no-remove -y "${packages[@]}" || return 1
      ;;
    brew)
      brew update || return 1
      HOMEBREW_NO_AUTO_UPDATE=1 brew upgrade "${packages[@]}" || return 1
      ;;
    *) die "unknown package manager: $PM" ;;
  esac
}

refresh_pm() {
  case "$PM" in
    apt)
      run_root apt-get update -y
      ;;
    pacman)
      yay -Syu --noconfirm --answerclean None --answerdiff None
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

setup_home_repo() {
  cd "$HOME"

  # Require a home repository, not an enclosing repository discovered by Git.
  if { [ -e .git ] || [ -L .git ]; } \
    && git rev-parse --verify --quiet HEAD^{commit} >/dev/null 2>&1; then
    info "git repository already present at $HOME; skipping git setup"
    return 0
  fi

  info "initializing git repository in $HOME"
  if git init -b main >/dev/null 2>&1; then
    true
  else
    git init
    git checkout -B main >/dev/null 2>&1 || true
  fi

  local origin_url
  origin_url="$(git remote get-url origin 2>/dev/null || true)"
  if [ -z "$origin_url" ]; then
    git remote add origin "$REPO_URL"
  elif [ "$origin_url" != "$REPO_URL" ]; then
    case "$origin_url" in
      *github.com[:/]"$REPO_SLUG"*) ;;
      *) die "origin is $origin_url; refusing to replace a different repository in $HOME" ;;
    esac
  fi
  git config --local core.hooksPath .githooks
  configure_git_identity
  info "fetching origin"
  git fetch origin

  git show-ref --verify --quiet refs/remotes/origin/main \
    || die "origin/main does not exist on $REPO_URL"

  backup_checkout_collisions origin/main
  info "checking out origin/main"
  git checkout -f -B main origin/main
}

rewrite_home_paths() {
  "${LOCAL_BIN}/rewrite-home-paths"
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
  export PATH="${MISE_SHIMS}:${LOCAL_BIN}:${HOME}/.grok/bin:${HOME}/.bun/bin:${PATH}"
}

# JSON owns tool membership and platform restrictions; TOML is generated output.
mise_tool_records() { setup_config mise-records; }
mise_tool_applies() { setup_config mise-applies "$1"; }

# Go commands must come from their own package, not a stray toolchain binary.
mise_tool_path() {
  local tool="$1" cmd="$2" root
  case "$tool" in
    go:*)
      root="$(mise_cmd where "$tool")" || return 1
      [ -n "$root" ] || return 1
      printf '%s/bin/%s\n' "$root" "$cmd"
      ;;
    *) mise_cmd which "$cmd" ;;
  esac
}

validate_mise_tool() {
  local tool="$1" cmd="$2" path
  path="$(mise_tool_path "$tool" "$cmd" 2>/dev/null || true)"
  [ -n "$path" ] && [ -x "$path" ] \
    || die "mise installed $tool, but $cmd is unavailable"
}

install_locked_mise_tools() {
  local tool cmd path
  info "installing the locked Go toolchain"
  mise_cmd install --locked go
  validate_mise_tool go go
  info "installing bun so npm packages use bun"
  mise_cmd install --locked bun
  validate_mise_tool bun bun
  info "reconciling the locked tool set in parallel"
  mise_cmd install --locked
  mise_cmd reshim
  while IFS='|' read -r tool cmd; do
    mise_tool_applies "$tool" || continue
    path="$(mise_tool_path "$tool" "$cmd" 2>/dev/null || true)"
    if [ -z "$path" ] || [ ! -x "$path" ]; then
      info "reinstalling $tool so $cmd is available"
      mise_cmd install --force --locked "$tool"
    fi
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

try:
    import tomllib
except ImportError:
    import tomli as tomllib

config = tomllib.loads(Path(os.environ["MISE_CONFIG_PATH"]).read_text())
configured_tools = config.get("tools", {})
configured = set(configured_tools)
lock_text = Path(os.environ["MISE_LOCK_PATH"]).read_text()
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
tool_platforms = {
    tool: value.get("os", ["linux", "macos"]) if isinstance(value, dict) else ["linux", "macos"]
    for tool, value in configured_tools.items()
}
for tool in locked:
    # Package-manager backends lock versions rather than release artifacts.
    if tool.startswith(("go:", "npm:", "pipx:")):
        continue
    tool_required = {
        platform for platform in required
        if platform.split(".", 1)[1].split("-", 1)[0] in tool_platforms[tool]
    }
    for platform in sorted(required):
        sections = artifacts.get((tool, platform), [])
        if platform not in tool_required:
            if sections:
                raise SystemExit(
                    f"mise lock has an unexpected {tool} artifact for {platform}"
                )
            continue
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

# Resolve only changed declarations on normal setup; --upgrade selects all tools.
# Both the generated config and the lock stay untouched until validation passes.
refresh_mise_lock() (
  local desired_config="${1:-$MISE_CONFIG}" upgrade="${2:-1}"
  local tmp lock_path staged staged_config token="" os platforms tool mode
  local platform_tools=()
  tmp="$(mktemp -d "${TMPDIR:-/tmp}/setup-mise-lock.XXXXXX")"
  lock_path="${MISE_CONFIG%/*}/mise.lock"
  staged="${lock_path}.setup.$$"
  staged_config="${MISE_CONFIG}.setup.$$"
  trap 'rm -rf "$tmp"; rm -f "$staged" "$staged_config"' EXIT HUP INT TERM
  mkdir -p "$tmp/.config/mise"
  [ ! -f "$MISE_CONFIG" ] || cp "$MISE_CONFIG" "$tmp/previous.toml"
  [ ! -f "$lock_path" ] || cp "$lock_path" "$tmp/previous.lock"
  cp "$desired_config" "$tmp/desired.toml"
  setup_config mise-plan "$tmp" "$upgrade" || return 1
  : >"$tmp/mise-lock.log"

  if [ -s "$tmp/changed-tools" ]; then
    # Version discovery for source/package-manager backends needs their runtimes
    # even on a fresh machine. Prefer the existing locked runtime when available.
    while IFS='|' read -r tool mode; do
      info "preparing $tool for package version discovery"
      if [ "$mode" = locked ]; then
        mise_cmd install --locked "$tool" || return 1
      else
        MISE_GLOBAL_CONFIG_FILE="$tmp/.config/mise/config.toml" mise_cmd install "$tool" || return 1
      fi
    done <"$tmp/bootstrap-tools"
    if [ -z "${GITHUB_TOKEN:-}" ] && have gh; then
      token="$(gh auth token 2>/dev/null || true)"
      [ -z "$token" ] || export GITHUB_TOKEN="$token"
    fi
    info "updating changed cross-platform tool locks"
    for os in linux macos; do
      platforms="$(printf '%s\n' "${MISE_LOCK_PLATFORMS//,/$'\n'}" | awk -v os="$os" 'index($0, os "-") == 1 { printf sep $0; sep = "," }')"
      [ -n "$platforms" ] || continue
      platform_tools=()
      while IFS= read -r tool; do
        [ -z "$tool" ] || platform_tools+=("$tool")
      done <"$tmp/$os-tools"
      [ "${#platform_tools[@]}" -gt 0 ] || continue
      info "locking ${#platform_tools[@]} tool(s) for $platforms"
      # --bump ignores locked versions, but still accepts cached remote lists.
      # Resolve changed tools freshly without clearing unrelated mise caches.
      if ! (
        cd "$tmp"
        MISE_GLOBAL_CONFIG_FILE="$tmp/.config/mise/config.toml" \
          MISE_HTTP_TIMEOUT=120 MISE_FETCH_REMOTE_VERSIONS_TIMEOUT=120 \
          MISE_FETCH_REMOTE_VERSIONS_CACHE=0s \
          mise_cmd lock --global --bump --platform "$platforms" "${platform_tools[@]}"
      ) 2>&1 | tee -a "$tmp/mise-lock.log"; then
        return 1
      fi
    done
  fi
  if grep -Eq '^mise WARN[[:space:]]+(Failed to resolve tool version list|Remote versions cannot be fetched|Error getting latest version)' \
    "$tmp/mise-lock.log"; then
    warn "mise could not resolve every requested tool version; existing config and lock were preserved"
    return 1
  fi
  validate_mise_lock "$tmp/desired.toml" "$tmp/.config/mise/mise.lock" || return 1
  setup_config mise-verify-lock "$tmp" || return 1
  if grep -Fxq 'github:llvm/llvm-project' "$tmp/changed-tools"; then
    assert_llvm_version_alignment "$tmp/.config/mise/mise.lock" || return 1
  fi
  # Do not overwrite a lock or configuration changed by another setup/user while
  # this candidate was resolving. No running upgrade is stopped or restarted.
  if [ -f "$tmp/previous.toml" ]; then
    cmp -s "$tmp/previous.toml" "$MISE_CONFIG" || die "mise config changed during lock resolution; retry setup"
  else
    [ ! -e "$MISE_CONFIG" ] || die "mise config appeared during lock resolution; retry setup"
  fi
  if [ -f "$tmp/previous.lock" ]; then
    cmp -s "$tmp/previous.lock" "$lock_path" || die "mise lock changed during resolution; retry setup"
  else
    [ ! -e "$lock_path" ] || die "mise lock appeared during resolution; retry setup"
  fi
  mkdir -p "${MISE_CONFIG%/*}"
  if ! cmp -s "$tmp/.config/mise/mise.lock" "$lock_path"; then
    cp "$tmp/.config/mise/mise.lock" "$staged"
    mv "$staged" "$lock_path"
  fi
  if ! cmp -s "$tmp/desired.toml" "$MISE_CONFIG"; then
    cp "$tmp/desired.toml" "$staged_config"
    mv "$staged_config" "$MISE_CONFIG"
  fi
)


sync_mise_config() {
  local before after
  MISE_LLVM_CHANGED=0
  before="$(locked_llvm_version 2>/dev/null || true)"
  (
    tmp="$(mktemp -d "${TMPDIR:-/tmp}/setup-mise-config.XXXXXX")"
    trap 'rm -rf "$tmp"' EXIT HUP INT TERM
    setup_config mise-render >"$tmp/config.toml" || exit 1
    refresh_mise_lock "$tmp/config.toml" "$UPGRADE"
  ) || return 1
  after="$(locked_llvm_version 2>/dev/null || true)"
  if [ -n "$after" ] && [ "$before" != "$after" ]; then MISE_LLVM_CHANGED=1; fi
}

locked_llvm_version() {
  local lock_path="${1:-${MISE_CONFIG%/*}/mise.lock}"
  MISE_LOCK_PATH="$lock_path" py <<'PY'
import os
from pathlib import Path

try:
    import tomllib
except ImportError:
    import tomli as tomllib

lock = tomllib.loads(Path(os.environ["MISE_LOCK_PATH"]).read_text())
entries = lock["tools"]["github:llvm/llvm-project"]
print(entries[0]["version"])
PY
}

brew_llvm_formula_version() {
  curl -fsSL "$LLVM_BREW_FORMULA_API" | py -c 'import json,sys; print(json.load(sys.stdin)["versions"]["stable"])'
}

assert_llvm_version_alignment() {
  local lock_path="${1:-${MISE_CONFIG%/*}/mise.lock}" brew_ver lock_ver
  PM=brew setup_config native-enabled llvm || return 0
  setup_config mise-has github:llvm/llvm-project || return 0
  brew_ver="$(brew_llvm_formula_version)" \
    || die "could not read the Homebrew llvm formula version"
  lock_ver="$(locked_llvm_version "$lock_path")" \
    || die "could not read the locked LLVM version"
  [ "$brew_ver" = "$lock_ver" ] \
    || die "LLVM versions differ: Homebrew $brew_ver, mise $lock_ver"
}

upgrade_mise_tools() {
  if [ "$UPGRADE" -eq 0 ] && [ "$PM" = brew ] && setup_config native-enabled llvm; then
    info "upgrading Homebrew llvm to the locked version"
    brew upgrade llvm || brew install --no-ask llvm
  fi
  install_locked_mise_tools
}

# ---------------------------------------------------------------------------
# Legacy source cleanup
# ---------------------------------------------------------------------------

legacy_packages() { setup_config legacy-packages "$1"; }

installed_pm_package() {
  case "$PM" in
    apt)
      dpkg-query -W -f='${Status}\n' "$1" 2>/dev/null \
        | grep -q 'install ok installed' \
        && printf '%s\n' "$1"
      ;;
    brew)
      # Named version queries default to formulae; casks need an explicit probe.
      if [ -n "$(brew list --versions "$1" 2>/dev/null)" ] \
        || [ -n "$(brew list --cask --versions "$1" 2>/dev/null)" ]; then
        printf '%s\n' "$1"
      else
        return 1
      fi
      ;;
    pacman)
      pacman -Qq "$1" 2>/dev/null
      ;;
  esac
}

# Prints the installed packages that require $1. Empty output means removing $1
# breaks nothing that is still installed. Optional dependencies are excluded:
# they do not block a removal.
pm_dependents() {
  case "$PM" in
    apt)
      apt-cache rdepends --installed --no-recommends --no-suggests \
        --no-conflicts --no-breaks --no-replaces --no-enhances "$1" 2>/dev/null \
        | awk 'NR > 2 { gsub(/[|<>]/, "", $1); if ($1 != "") print $1 }'
      ;;
    brew)
      brew uses --installed "$1" 2>/dev/null || true
      ;;
    pacman)
      # "Required By" holds one space-separated list that wraps onto indented
      # continuation lines; the next field name starts at column one.
      LC_ALL=C pacman -Qi "$1" 2>/dev/null | awk '
        /^[^[:space:]]/ { collecting = 0 }
        /^Required By[[:space:]]*:/ { collecting = 1; sub(/^[^:]*:[[:space:]]*/, "") }
        collecting { for (i = 1; i <= NF; i++) if ($i != "None") print $i }
      '
      ;;
  esac
}

# Prints the subset of the given installed packages that can be removed in one
# transaction: a package qualifies once every installed package depending on it
# is in the subset too. A package held back for an outside dependent can in turn
# hold back another, so the set is narrowed until it stops changing. Packages the
# machine still needs are reported and skipped individually instead of costing
# the whole batch its removal.
filter_removable_packages() {
  local pkg dep keep changed=1
  local remaining=("$@") kept=()

  [ "$#" -gt 0 ] || return 0

  while [ "$changed" -eq 1 ]; do
    changed=0
    kept=()
    for pkg in ${remaining[@]+"${remaining[@]}"}; do
      keep=1
      while IFS= read -r dep; do
        [ -n "$dep" ] || continue
        if ! in_list "$dep" ${remaining[@]+"${remaining[@]}"}; then
          warn "keeping legacy $PM package $pkg; still required by $dep"
          keep=0
          break
        fi
      done < <(pm_dependents "$pkg")
      [ "$keep" -eq 0 ] || kept+=("$pkg")
    done
    if [ "${#kept[@]}" -ne "${#remaining[@]}" ]; then
      remaining=(${kept[@]+"${kept[@]}"})
      changed=1
    fi
  done

  [ "${#remaining[@]}" -eq 0 ] || printf '%s\n' ${remaining[@]+"${remaining[@]}"}
}

remove_legacy_packages() {
  local pkg resolved plan removed name
  local candidates=() removable=()
  for pkg in "$@"; do
    [ -n "$pkg" ] || continue
    resolved="$(installed_pm_package "$pkg")" || continue
    in_list "$resolved" ${candidates[@]+"${candidates[@]}"} || candidates+=("$resolved")
  done
  [ "${#candidates[@]}" -gt 0 ] || return 0

  while IFS= read -r pkg; do
    [ -n "$pkg" ] || continue
    removable+=("$pkg")
  done < <(filter_removable_packages "${candidates[@]}")
  [ "${#removable[@]}" -gt 0 ] || return 0

  # The replacements are installed and validated before this runs, so a refused
  # removal leaves a redundant package behind rather than a broken setup.
  case "$PM" in
    brew)
      info "removing legacy brew packages: ${removable[*]}"
      brew uninstall --formula "${removable[@]}" \
        || warn "keeping legacy brew packages; brew refused the removal"
      ;;
    apt)
      plan="$(apt-get -s remove "${removable[@]}")" \
        || { warn "keeping legacy apt packages; removal simulation failed"; return 0; }
      removed="$(printf '%s\n' "$plan" | awk '$1 == "Remv" { print $2 }')"
      for name in $removed; do
        if ! in_list "${name%%:*}" ${removable[@]+"${removable[@]}"}; then
          warn "keeping legacy apt packages; removal would also remove $name"
          return 0
        fi
      done
      info "removing legacy apt packages: ${removable[*]}"
      run_root apt-get remove -y "${removable[@]}" \
        || warn "keeping legacy apt packages; apt refused the removal"
      ;;
    pacman)
      info "removing legacy pacman packages: ${removable[*]}"
      run_root pacman -R --noconfirm "${removable[@]}" \
        || warn "keeping legacy pacman packages; pacman refused the removal"
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

legacy_bun_package() { setup_config legacy-bun "$1"; }

# Prints the bun global package for $1 unless ~/.bun/bin/$1 is already the
# validated mise replacement.
legacy_bun_leftover_package() {
  local cmd="$1" replacement="$2" pkg bin path_real replacement_real
  pkg="$(legacy_bun_package "$cmd")"
  [ -n "$pkg" ] || return 0
  bin="${HOME}/.bun/bin/${cmd}"
  if [ -n "$replacement" ] && { [ -e "$bin" ] || [ -L "$bin" ]; }; then
    path_real="$(realpath "$bin" 2>/dev/null || true)"
    replacement_real="$(realpath "$replacement" 2>/dev/null || true)"
    if [ -n "$path_real" ] && [ "$path_real" = "$replacement_real" ]; then
      return 0
    fi
  fi
  printf '%s\n' "$pkg"
}

installed_bun_packages() {
  local manifest="${HOME}/.bun/install/global/package.json"
  [ -f "$manifest" ] || return 0
  [ "$#" -gt 0 ] || return 0
  BUN_GLOBAL_MANIFEST="$manifest" py - "$@" <<'PY'
import json, os, sys
from pathlib import Path

data = json.loads(Path(os.environ["BUN_GLOBAL_MANIFEST"]).read_text())
deps = data.get("dependencies") or {}
for pkg in sys.argv[1:]:
    if pkg in deps:
        print(pkg)
PY
}

remove_legacy_bun_packages() {
  local pkg
  local packages=()
  [ "$#" -gt 0 ] || return 0
  while IFS= read -r pkg; do
    [ -n "$pkg" ] || continue
    in_list "$pkg" ${packages[@]+"${packages[@]}"} || packages+=("$pkg")
  done < <(installed_bun_packages "$@")
  [ "${#packages[@]}" -gt 0 ] || return 0
  info "removing leftover bun packages: ${packages[*]}"
  bun remove -g "${packages[@]}" \
    || warn "keeping leftover bun packages; bun remove failed"
}

cleanup_legacy_files() {
  local cmd="$1" path probe origin replacement records
  records="$(setup_config legacy-files "$cmd")" || return 1
  while IFS='|' read -r path probe; do
    [ -n "$path" ] || continue
    replacement="$(mise_cmd which "$probe" 2>/dev/null || true)"
    remove_legacy_file "${HOME}/$path" "$replacement"
  done <<<"$records"
  records="$(setup_config legacy-directories "$cmd")" || return 1
  while IFS='|' read -r path probe origin; do
    [ -n "$path" ] || continue
    path="${HOME}/$path"
    if [ -n "$probe" ]; then
      [ -x "$path/$probe" ] || continue
    else
      [ -d "$path/.git" ] || continue
      git -C "$path" remote get-url origin 2>/dev/null | grep -Fq "$origin" || continue
    fi
    info "removing legacy tool directory $path"
    rm -rf "$path"
  done <<<"$records"
}

# Only declared Go-package commands are candidates; preserve all other binaries.
cleanup_go_toolchain_command() {
  local tool="$1" cmd="$2" replacement installs root
  case "$tool" in go:*) ;; *) return 0 ;; esac
  case "$cmd" in ''|*/*|go|gofmt|.|..) die "unsafe Go cleanup command: $cmd" ;; esac
  replacement="$(mise_tool_path "$tool" "$cmd")" || return 1
  [ -x "$replacement" ] || die "cannot clean up $cmd without its mise package binary"
  installs="$(mise_cmd ls go --installed --json)" || return 1
  installs="$(printf '%s' "$installs" | py -c '
import json, sys
for tool in json.load(sys.stdin):
    print(tool["install_path"])
')" || return 1
  while IFS= read -r root; do
    [ -n "$root" ] || continue
    case "$root" in /*) ;; *) die "invalid Go installation path: $root" ;; esac
    [ -x "$root/bin/go" ] || die "invalid Go installation: $root"
    remove_legacy_file "$root/bin/$cmd" "$replacement"
  done <<<"$installs"
}

cleanup_legacy_tool_sources() {
  local tool cmd pkg
  local packages=() bun_packages=()
  info "reconciling tool ownership"
  while IFS= read -r pkg; do
    [ -z "$pkg" ] || packages+=("$pkg")
  done < <(legacy_packages mise)
  while IFS='|' read -r tool cmd; do
    mise_tool_applies "$tool" || continue
    validate_mise_tool "$tool" "$cmd"
    while IFS= read -r pkg; do
      [ -z "$pkg" ] || packages+=("$pkg")
    done < <(legacy_packages "$cmd")
    pkg="$(legacy_bun_leftover_package "$cmd" "$(mise_cmd which "$cmd" 2>/dev/null || true)")"
    if [ -n "$pkg" ] && ! in_list "$pkg" ${bun_packages[@]+"${bun_packages[@]}"}; then
      bun_packages+=("$pkg")
    fi
  done < <(mise_tool_records)
  remove_legacy_packages ${packages[@]+"${packages[@]}"}
  remove_legacy_bun_packages ${bun_packages[@]+"${bun_packages[@]}"}
  while IFS='|' read -r tool cmd; do
    mise_tool_applies "$tool" || continue
    cleanup_go_toolchain_command "$tool" "$cmd"
    cleanup_legacy_files "$cmd"
    validate_mise_tool "$tool" "$cmd"
  done < <(mise_tool_records)
  if [ "$OS" = Darwin ]; then
    local brew_clang="" eza_install
    brew_clang="$(brew --prefix llvm 2>/dev/null || true)"
    if setup_config native-enabled llvm && [ -n "$brew_clang" ] && [ -x "$brew_clang/bin/clang" ]; then
      remove_legacy_file "${LOCAL_BIN}/clang" "$brew_clang/bin/clang"
    fi
    eza_install="${HOME}/.local/share/mise/installs/github-eza-community-eza"
    if setup_config native-enabled eza && [ -d "$eza_install" ]; then
      info "removing leftover mise eza on macOS"
      rm -rf "$eza_install"
      if [ -x "$MISE_BIN" ]; then
        mise_cmd reshim >/dev/null 2>&1 \
          || warn "could not refresh mise shims after removing leftover eza"
      fi
    fi
  fi
  hash -r 2>/dev/null || true
}

# ---------------------------------------------------------------------------
# Additional tools
# ---------------------------------------------------------------------------

install_vendor() {
  local name="$1" path url shell label item records
  local updates=() environment=() obsolete=() packages=()
  path="${HOME}/$(setup_config vendor-field "$name" path)"
  url="$(setup_config vendor-field "$name" url)"
  shell="$(setup_config vendor-field "$name" shell)"
  label="$(setup_config vendor-field "$name" label)"
  records="$(setup_config vendor-field "$name" update)"
  while IFS= read -r item; do [ -z "$item" ] || updates+=("$item"); done <<<"$records"
  records="$(setup_config vendor-env "$name")"
  while IFS= read -r item; do [ -z "$item" ] || environment+=("$item"); done <<<"$records"
  if [ ! -x "$path" ] || { [ "$UPGRADE" -eq 1 ] && [ "${#updates[@]}" -eq 0 ]; }; then
    info "installing/updating $label"
    curl -fsSL "$url" | env ${environment[@]+"${environment[@]}"} "$shell"
  elif [ "$UPGRADE" -eq 1 ]; then
    info "updating $label"
    "$path" "${updates[@]}"
  fi
  [ -x "$path" ] || die "$label is unavailable at $path"
  records="$(setup_config vendor-field "$name" legacy_mise)"
  while IFS= read -r item; do [ -z "$item" ] || obsolete+=("$item"); done <<<"$records"
  if [ "${#obsolete[@]}" -gt 0 ]; then
    mise_cmd uninstall --all "${obsolete[@]}" >/dev/null 2>&1 \
      || warn "could not remove legacy mise-managed $label"
    mise_cmd reshim
  fi
  records="$(legacy_packages "$name")"
  while IFS= read -r item; do [ -z "$item" ] || packages+=("$item"); done <<<"$records"
  remove_legacy_packages ${packages[@]+"${packages[@]}"}
}

run_additional_installs() (
  local log_root index log status failed=0 name label records offset end
  local names=() labels=() pids=() logs=()
  records="$(setup_config vendors)" || return 1
  while IFS='|' read -r name label; do
    [ -n "$name" ] || continue
    names+=("$name"); labels+=("$label")
  done <<<"$records"
  log_root="$(mktemp -d "${TMPDIR:-/tmp}/setup-vendor.XXXXXX")"
  trap 'rm -rf "$log_root"' EXIT HUP INT TERM
  # Bound concurrency even when the config grows. Report all jobs before failing.
  for ((offset = 0; offset < ${#names[@]}; offset += 4)); do
    end=$((offset + 4))
    [ "$end" -le "${#names[@]}" ] || end=${#names[@]}
    for ((index = offset; index < end; index++)); do
      log="${log_root}/${index}.log"
      logs[index]="$log"
      info "starting ${labels[$index]}"
      (STEP="install ${labels[$index]}"; install_vendor "${names[$index]}") >"$log" 2>&1 &
      pids[index]=$!
    done
    for ((index = offset; index < end; index++)); do
      if wait "${pids[$index]}"; then status=0; else status=$?; failed=1; fi
      info "install log: ${labels[$index]}"
      if [ -s "${logs[$index]}" ]; then cat "${logs[$index]}"; else log "  completed with no output"; fi
      [ "$status" -eq 0 ] || warn "${labels[$index]} install failed with status $status"
    done
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

verify_brew_llvm() {
  local prefix ver lock_ver
  prefix="$(brew --prefix llvm 2>/dev/null || true)"
  if [ -z "$prefix" ] || [ ! -x "$prefix/bin/clang" ]; then
    log "  MISS clang (brew llvm)"
    return 1
  fi
  ver="$("$prefix/bin/llvm-config" --version 2>/dev/null || true)"
  lock_ver="$(locked_llvm_version)" || return 1
  if [ "$ver" != "$lock_ver" ]; then
    log "  MISS llvm version brew=$ver lock=$lock_ver"
    return 1
  fi
  log "  ok  clang ($prefix/bin/clang) $ver"
}

verify_setup() {
  local required_failed=0 tool cmd path records name label
  info "native commands"
  records="$(setup_config native-required)" || return 1
  while IFS= read -r name; do
    [ -n "$name" ] || continue
    if have_logical "$name"; then log "  ok  $name"; else log "  MISS $name"; required_failed=1; fi
  done <<<"$records"
  if [ "$PM" = pacman ] && ! check_cmds yay; then
    required_failed=1
  fi
  info "mise-managed commands"
  while IFS='|' read -r tool cmd; do
    mise_tool_applies "$tool" || continue
    path="$(mise_tool_path "$tool" "$cmd" 2>/dev/null || true)"
    if [ -n "$path" ] && [ -x "$path" ]; then
      log "  ok  $cmd ($path)"
    else
      log "  MISS $cmd ($tool)"
      required_failed=1
    fi
  done < <(mise_tool_records)
  if [ "$OS" = Darwin ] && setup_config native-enabled llvm && setup_config mise-has github:llvm/llvm-project; then
    info "Homebrew llvm"
    load_brew_llvm_env
    if ! verify_brew_llvm; then required_failed=1; fi
  fi
  info "additional commands"
  records="$(setup_config vendors)" || return 1
  while IFS='|' read -r name label; do
    [ -n "$name" ] || continue
    path="${HOME}/$(setup_config vendor-field "$name" path)"
    if [ -x "$path" ]; then log "  ok  $label ($path)"; else log "  MISS $label ($path)"; required_failed=1; fi
  done <<<"$records"
  if [ "$required_failed" -ne 0 ]; then
    die "required tools are missing; re-run setup.sh"
  fi
}

usage() {
  cat <<'EOF'
Usage: setup.sh [--upgrade] [--config PATH] [--check-config]

Package choices and vendor installers live in setup.json beside this script.
Mise declarations also live in setup.json; .config/mise/config.toml is generated.
--config selects another JSON file; SETUP_CONFIG is the environment equivalent.
--check-config validates JSON only, without downloads, installs, or checkout changes.
Removing an entry stops managing it; it does not uninstall existing software.

Install missing native and locked cross-platform tools, reconcile each tool to
its declared owner, then check the agentic-dotfiles repository out into $HOME
unless the home repository already has a commit at HEAD, which skips Git setup.

Without --upgrade, added or changed declarations refresh their lock entries;
unchanged tools retain their locked versions without a full remote refresh. Packages from legacy Brew, APT, Pacman, and direct-install
sources are removed only after the replacement validates. --upgrade advances the
tracked multi-platform mise lock, installs it, and upgrades installed native
packages declared in setup.json (including optional packages). Package managers
may also update required dependencies. On Arch, --upgrade performs a full system
upgrade with yay, including AUR packages. Run setup as a regular user on Arch;
yay uses sudo when required.
Homebrew llvm on macOS and the locked Linux mise
toolchain stay on the same version. GitHub eza has no macOS archives; macOS
installs Homebrew eza instead.
EOF
}

# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

main() {
  local check_config=0 explicit_config="${SETUP_CONFIG_EXPLICIT:-0}"
  while [ "$#" -gt 0 ]; do
    case "$1" in
      -h|--help)
        usage
        return 0
        ;;
      --upgrade)
        UPGRADE=1
        ;;
      --config)
        [ "$#" -ge 2 ] || die "--config needs a path"
        SETUP_CONFIG="$2"
        explicit_config=1
        shift
        ;;
      --check-config)
        check_config=1
        ;;
      *)
        die "unknown argument: $1"
        ;;
    esac
    shift
  done
  case "$SETUP_CONFIG" in /*) ;; *) SETUP_CONFIG="$PWD/$SETUP_CONFIG" ;; esac
  if [ "$check_config" -eq 1 ]; then
    setup_config validate
    info "setup config is valid: $SETUP_CONFIG"
    return 0
  fi
  if [ "$explicit_config" -eq 1 ] && [ ! -f "$SETUP_CONFIG" ]; then
    die "setup config is missing: $SETUP_CONFIG"
  fi
  if [ -f "$SETUP_CONFIG" ] && { have python3 || have python; }; then
    setup_config validate
  fi

  mkdir -p "$LOCAL_BIN" "$BACKUP_ROOT"
  cd "$HOME"

  STEP="detect package manager"
  detect_pm
  info "using $PM on $OS/$GOARCH"
  if [ "$UPGRADE" -eq 1 ] && [ "$PM" = pacman ] && [ "$(id -u)" -eq 0 ]; then
    die "run setup --upgrade as a regular user on Arch; yay uses sudo when required"
  fi

  STEP="ensure brew"
  ensure_brew

  STEP="ensure sudo"
  ensure_sudo

  STEP="ensure yay"
  ensure_yay

  STEP="load setup config"
  # The parser is a bootstrap dependency, not a configurable managed package.
  if ! have python3 && ! have python; then
    refresh_pm
    if [ "$PM" = apt ]; then pm_install_batch python3; else pm_install_batch python; fi
  fi
  # Use one validated snapshot throughout the run, including across checkout.
  SETUP_RUN_DIR="$(mktemp -d "${TMPDIR:-/tmp}/setup-config.XXXXXX")"
  trap 'rm -rf "$SETUP_RUN_DIR"' EXIT
  if [ -f "$SETUP_CONFIG" ]; then
    cp "$SETUP_CONFIG" "$SETUP_RUN_DIR/setup.json"
  else
    have curl || pm_install_batch curl
    curl -fsSL "https://raw.githubusercontent.com/${REPO_SLUG}/main/setup.json" -o "$SETUP_RUN_DIR/setup.json"
  fi
  SETUP_CONFIG="$SETUP_RUN_DIR/setup.json"
  setup_config validate

  # Bring Arch's system and repository databases forward together before installs.
  if [ "$PM" = pacman ]; then
    STEP="upgrade Arch system"
    upgrade_configured_packages
  fi

  STEP="install packages"
  install_configured_packages
  have git || die "git is required"
  have curl || die "curl is required"
  load_brew_llvm_env

  STEP="ensure TOML parser"
  ensure_toml_parser

  STEP="select Go proxy"

  STEP="setup home git repository"
  setup_home_repo

  STEP="validate mise inventory"
  setup_config mise-records >/dev/null

  STEP="install mise"
  install_mise

  STEP="sync mise configuration and lock"
  sync_mise_config

  STEP="upgrade setup-owned native packages"
  if [ "$PM" != pacman ]; then upgrade_configured_packages; fi

  STEP="install cross-platform tools"
  if [ "$UPGRADE" -eq 1 ] || [ "$MISE_LLVM_CHANGED" -eq 1 ]; then
    upgrade_mise_tools
  else
    install_locked_mise_tools
  fi

  STEP="compile user-owned helpers and hooks"
  if [ -x "${LOCAL_BIN}/compile-agent-tools" ]; then
    "${LOCAL_BIN}/compile-agent-tools"
  fi

  STEP="resolve home paths in configuration"
  rewrite_home_paths

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

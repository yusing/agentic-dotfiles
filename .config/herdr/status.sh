#!/bin/sh
# Tab-bar modules matching tmux status-right: application, AI usage, cpu, ram, net, uptime.
set -u

LC_ALL=C
export LC_ALL

state_dir=${HERDR_STATUS_STATE_DIR:-${XDG_CACHE_HOME:-$HOME/.cache}/herdr-status}
proc_stat=${HERDR_STATUS_PROC_STAT:-/proc/stat}
proc_meminfo=${HERDR_STATUS_PROC_MEMINFO:-/proc/meminfo}
proc_net_dev=${HERDR_STATUS_PROC_NET_DEV:-/proc/net/dev}
proc_uptime=${HERDR_STATUS_PROC_UPTIME:-/proc/uptime}
proc_route=${HERDR_STATUS_PROC_ROUTE:-/proc/net/route}

os_name() {
	if [ -n "${HERDR_STATUS_UNAME:-}" ]; then
		printf '%s\n' "$HERDR_STATUS_UNAME"
		return
	fi
	uname -s
}

now_epoch() {
	if [ -n "${HERDR_STATUS_NOW:-}" ]; then
		printf '%s\n' "$HERDR_STATUS_NOW"
		return
	fi
	date +%s
}

ensure_state_dir() {
	mkdir -p "$state_dir"
	chmod 0700 "$state_dir" 2>/dev/null || true
}

print_speed() {
	awk -v bytes="$1" 'BEGIN {
		if (bytes < 0) bytes = 0
		kb = int(bytes / 1024)
		mb = int(bytes / 1048576)
		if (mb != 0) printf "%s MB/s", mb
		else if (kb != 0) printf "%s KB/s", kb
		else printf "%s B/s", int(bytes)
	}'
}

read_state() {
	# key -> prints stored line or nothing
	if [ -f "$state_dir/$1" ]; then
		cat "$state_dir/$1"
	fi
}

write_state() {
	printf '%s\n' "$2" >"$state_dir/$1"
}

linux_cpu_times() {
	awk '
		$1 == "cpu" {
			idle = $5 + $6
			total = $2 + $3 + $4 + idle + $7 + $8 + $9
			print total, idle
			exit
		}
	' "$proc_stat"
}

darwin_cpu_percent() {
	ncpu=$(sysctl -n hw.ncpu 2>/dev/null) || return 1
	ps -A -o %cpu= | awk -v ncpu="$ncpu" '
		{ s += $1 }
		END {
			if (ncpu <= 0) exit 1
			printf "%.1f%%\n", s / ncpu
		}
	'
}

mod_cpu() {
	os=$(os_name)
	case "$os" in
	Linux)
		[ -r "$proc_stat" ] || return 0
		ensure_state_dir
		times=$(linux_cpu_times) || return 0
		now=$(now_epoch)
		prev=$(read_state cpu)
		write_state cpu "$now $times"
		if [ -z "$prev" ]; then
			return 0
		fi
		printf '%s %s\n' "$prev" "$times" | awk '
			{
				pt = $2; pi = $3; t = $4; i = $5
				dt = t - pt
				di = i - pi
				if (dt <= 0 || di < 0 || di > dt) exit 1
				printf "%.1f%%\n", 100 * (dt - di) / dt
			}
		' || return 0
		;;
	Darwin)
		darwin_cpu_percent || return 0
		;;
	*)
		return 0
		;;
	esac
}

linux_ram_percent() {
	awk '
		$1 == "MemTotal:" { total = $2 }
		$1 == "MemAvailable:" { avail = $2 }
		END {
			if (total <= 0) exit 1
			printf "%.1f%%\n", 100 * (total - avail) / total
		}
	' "$proc_meminfo"
}

darwin_ram_percent() {
	pagesize_bytes=${HERDR_STATUS_PAGESIZE:-}
	if [ -z "$pagesize_bytes" ]; then
		pagesize_bytes=$(pagesize 2>/dev/null) || return 1
	fi
	if [ -n "${HERDR_STATUS_VM_STAT:-}" ]; then
		stats=$(cat "$HERDR_STATUS_VM_STAT")
	else
		stats=$(vm_stat)
	fi
	printf '%s\n' "$stats" | awk -v pagesize="$pagesize_bytes" '
		/Pages free:/ { free = $NF + 0 }
		/Pages active:/ { active = $NF + 0 }
		/Pages inactive:/ { inactive = $NF + 0 }
		/Pages speculative:/ { spec = $NF + 0 }
		/Pages wired down:/ { wired = $NF + 0 }
		/Pages occupied by compressor:/ { compressor = $NF + 0 }
		/Pages purgeable:/ { purgeable = $NF + 0 }
		/File-backed pages:/ { file = $NF + 0 }
		END {
			used_and_cached = (active + inactive + spec + wired + compressor) * pagesize
			cached = (purgeable + file) * pagesize
			free_b = free * pagesize
			used = used_and_cached - cached
			total = used_and_cached + free_b
			if (total <= 0) exit 1
			printf "%.1f%%\n", 100 * used / total
		}
	'
}

mod_ram() {
	os=$(os_name)
	case "$os" in
	Linux)
		[ -r "$proc_meminfo" ] || return 0
		linux_ram_percent || return 0
		;;
	Darwin)
		darwin_ram_percent || return 0
		;;
	*)
		return 0
		;;
	esac
}

linux_default_iface() {
	if [ -n "${HERDR_STATUS_IFACE:-}" ]; then
		printf '%s\n' "$HERDR_STATUS_IFACE"
		return
	fi
	[ -r "$proc_route" ] || return 1
	awk '$2 == "00000000" { print $1; exit }' "$proc_route"
}

darwin_default_iface() {
	if [ -n "${HERDR_STATUS_IFACE:-}" ]; then
		printf '%s\n' "$HERDR_STATUS_IFACE"
		return
	fi
	route -n get default 2>/dev/null | awk '/interface:/ { print $2; exit }'
}

linux_iface_bytes() {
	iface=$1
	awk -v iface="$iface" '
		$1 == iface ":" {
			print $2, $10
			exit
		}
	' "$proc_net_dev"
}

darwin_iface_bytes() {
	iface=$1
	netstat -ibn -I "$iface" 2>/dev/null | awk -v iface="$iface" '
		$1 == iface { print $7, $10; exit }
	'
}

mod_net() {
	os=$(os_name)
	case "$os" in
	Linux)
		iface=$(linux_default_iface) || return 0
		[ -n "$iface" ] && [ -r "$proc_net_dev" ] || return 0
		bytes=$(linux_iface_bytes "$iface") || return 0
		;;
	Darwin)
		iface=$(darwin_default_iface) || return 0
		[ -n "$iface" ] || return 0
		bytes=$(darwin_iface_bytes "$iface") || return 0
		;;
	*)
		return 0
		;;
	esac
	[ -n "$bytes" ] || return 0
	ensure_state_dir
	now=$(now_epoch)
	prev=$(read_state net)
	write_state net "$now $bytes"
	if [ -z "$prev" ]; then
		return 0
	fi
	rates=$(printf '%s %s %s\n' "$prev" "$now" "$bytes" | awk '
		{
			pt = $1; prx = $2; ptx = $3
			t = $4; rx = $5; tx = $6
			dt = t - pt
			if (dt <= 0 || rx < prx || tx < ptx) exit 1
			printf "%.0f %.0f\n", (rx - prx) / dt, (tx - ptx) / dt
		}
	') || return 0
	[ -n "$rates" ] || return 0
	rx_rate=${rates%% *}
	tx_rate=${rates#* }
	rx_h=$(print_speed "$rx_rate")
	tx_h=$(print_speed "$tx_rate")
	printf '󰤨 ↓%s ↑%s\n' "$rx_h" "$tx_h"
}

format_uptime() {
	awk -v s="$1" 'BEGIN {
		if (s < 0) s = 0
		s = int(s)
		days = int(s / 86400)
		hours = int((s % 86400) / 3600)
		mins = int((s % 3600) / 60)
		secs = s % 60
		if (days > 0 && mins > 0) printf "%dd%dh%dm\n", days, hours, mins
		else if (days > 0) printf "%dd%dh\n", days, hours
		else if (hours > 0) printf "%dh%dm\n", hours, mins
		else if (mins > 0) printf "%dm\n", mins
		else printf "%ds\n", secs
	}'
}

mod_uptime() {
	os=$(os_name)
	case "$os" in
	Linux)
		[ -r "$proc_uptime" ] || return 0
		secs=$(awk '{ print int($1) }' "$proc_uptime") || return 0
		;;
	Darwin)
		boot=$(sysctl -n kern.boottime 2>/dev/null | awk '{
			for (i = 1; i <= NF; i++) {
				if ($i == "sec") {
					sec = $(i + 2)
					gsub(/[^0-9]/, "", sec)
					print sec
					exit
				}
			}
		}') || return 0
		[ -n "$boot" ] || return 0
		now=$(now_epoch)
		secs=$((now - boot))
		;;
	*)
		return 0
		;;
	esac
	[ -n "$secs" ] || return 0
	formatted=$(format_uptime "$secs") || return 0
	printf '󰔟 %s\n' "$formatted"
}

extract_argv0() {
	python3 -c '
import json, sys
try:
    data = json.load(sys.stdin)
except Exception:
    sys.exit(0)
info = (data.get("result") or {}).get("process_info") or {}
procs = info.get("foreground_processes") or []
if not procs:
    sys.exit(0)
proc = procs[0] or {}
name = proc.get("argv0") or proc.get("name") or ""
print(name)
'
}

mod_application() {
	herdr_bin=${HERDR_BIN_PATH:-herdr}
	if [ -n "${HERDR_ACTIVE_PANE_ID:-}" ]; then
		out=$("$herdr_bin" pane process-info --pane "$HERDR_ACTIVE_PANE_ID" 2>/dev/null) || return 0
	else
		out=$("$herdr_bin" pane process-info --current 2>/dev/null) || return 0
	fi
	command -v python3 >/dev/null 2>&1 || return 0
	name=$(printf '%s\n' "$out" | extract_argv0) || return 0
	name=${name##*/}
	[ -n "$name" ] || return 0
	printf ' %s\n' "$name"
}

mod_ai_usage() {
	command -v python3 >/dev/null 2>&1 || return 0
	ensure_state_dir
	python3 - "$1" "$state_dir" 2>/dev/null <<'PY' || return 0
import fcntl
import json
import os
import sys
import tempfile
import time
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

WEEK_SECONDS = 7 * 24 * 60 * 60
provider = sys.argv[1]
state_dir = Path(sys.argv[2])
now = float(os.environ.get("HERDR_STATUS_NOW", time.time()))


def read_json(path):
    with Path(path).open() as source:
        return json.load(source)


def request_json(url, headers=None, data=None):
    request = urllib.request.Request(url, data=data)
    for key, value in (headers or {}).items():
        request.add_header(key, value)
    with urllib.request.urlopen(request, timeout=4) as response:
        return json.load(response)


def parse_timestamp(value):
    if isinstance(value, (int, float)) and not isinstance(value, bool):
        return float(value)
    return datetime.fromisoformat(value.replace("Z", "+00:00")).timestamp()


def write_private_json(path, payload):
    path = Path(path)
    with tempfile.NamedTemporaryFile(
        mode="w", dir=path.parent, prefix=f".{path.name}.", delete=False
    ) as output:
        temporary = Path(output.name)
        os.chmod(temporary, 0o600)
        json.dump(payload, output, separators=(",", ":"))
        output.write("\n")
    os.replace(temporary, path)


def valid_record(record):
    try:
        used = record["used"]
        reset_at = float(record["reset_at"])
        return (
            isinstance(used, (int, float))
            and not isinstance(used, bool)
            and reset_at > now
        )
    except (KeyError, TypeError, ValueError):
        return False


def cache_record(name, credential_path, fetch):
    cache_path = state_dir / f"{name}-usage.json"
    cached = None
    failure_cached = False
    try:
        candidate = read_json(cache_path)
        if valid_record(candidate):
            cached = candidate
        elif candidate == {"reset_at": 0}:
            failure_cached = True
    except Exception:
        pass

    # Provider usage refreshes with the three-minute redraw.
    # A newer credential store bypasses the cache after login/refresh.
    refresh_seconds = 180
    try:
        cache_mtime = cache_path.stat().st_mtime
        credential_mtime = Path(credential_path).stat().st_mtime
        fresh = now - cache_mtime < refresh_seconds and cache_mtime >= credential_mtime
    except OSError:
        fresh = False

    if fresh:
        if cached is not None:
            return cached
        if failure_cached:
            raise ValueError
    try:
        current = fetch()
        if not valid_record(current):
            raise ValueError
        write_private_json(cache_path, current)
        return current
    except Exception:
        if cached is not None:
            # Credential rotation may succeed before the usage request fails.
            # Advance the preserved cache so failure waits the refresh interval.
            write_private_json(cache_path, cached)
            return cached
        write_private_json(cache_path, {"reset_at": 0})
        raise


def codex_usage():
    codex_home = Path(os.environ.get("CODEX_HOME", Path.home() / ".codex"))
    auth_path = Path(os.environ.get("HERDR_STATUS_CODEX_AUTH", codex_home / "auth.json"))

    def fetch():
        auth = read_json(auth_path)
        tokens = auth.get("tokens") or {}
        token = auth.get("access_token") or tokens.get("access_token")
        account_id = auth.get("account_id") or tokens.get("account_id")
        payload = request_json(
            os.environ.get(
                "HERDR_STATUS_CODEX_USAGE_URL",
                "https://chatgpt.com/backend-api/wham/usage",
            ),
            {
                "Authorization": f"Bearer {token}",
                "ChatGPT-Account-Id": account_id,
                "User-Agent": "herdr-status/1",
            },
        )

        rate_limit = payload.get("rate_limit") or {}
        weekly = next(
            window
            for window in (
                rate_limit.get("primary_window"),
                rate_limit.get("secondary_window"),
            )
            if isinstance(window, dict)
            and window.get("limit_window_seconds") == WEEK_SECONDS
        )
        seconds = weekly.get("reset_after_seconds")
        reset_at = now + float(seconds) if seconds is not None else float(weekly["reset_at"])
        return {
            "used": weekly["used_percent"],
            "reset_at": reset_at,
            "banked": (payload.get("rate_limit_reset_credits") or {}).get(
                "available_count"
            ),
        }

    return cache_record("codex", auth_path, fetch)


def grok_access_token(auth_path):
    # xAI rotates refresh tokens, so share Grok's lock and persist each replacement.
    lock_path = auth_path.with_name(f"{auth_path.name}.lock")
    with lock_path.open("a+") as lock:
        fcntl.flock(lock, fcntl.LOCK_EX)
        auth = read_json(auth_path)
        credential = next(
            value
            for value in auth.values()
            if isinstance(value, dict) and value.get("refresh_token")
        )
        issuer = credential.get("oidc_issuer") or "https://auth.x.ai"
        token_url = os.environ.get(
            "HERDR_STATUS_GROK_TOKEN_URL", f"{issuer.rstrip('/')}/oauth2/token"
        )
        data = urllib.parse.urlencode(
            {
                "grant_type": "refresh_token",
                "refresh_token": credential["refresh_token"],
                "client_id": credential["oidc_client_id"],
            }
        ).encode()
        refreshed = request_json(
            token_url, {"Content-Type": "application/x-www-form-urlencoded"}, data
        )
        access_token = refreshed["access_token"]
        rotated = refreshed.get("refresh_token")
        if rotated:
            credential["refresh_token"] = rotated
            refreshed_at = datetime.now(timezone.utc)
            lifetime = refreshed.get("refresh_token_expires_in")
            credential["create_time"] = refreshed_at.isoformat().replace("+00:00", "Z")
            if lifetime is not None:
                expires_at = refreshed_at.timestamp() + float(lifetime)
                credential["expires_at"] = datetime.fromtimestamp(
                    expires_at, timezone.utc
                ).isoformat().replace("+00:00", "Z")
            write_private_json(auth_path, auth)
        return access_token


def grok_usage():
    grok_home = Path(os.environ.get("GROK_HOME", Path.home() / ".grok"))
    auth_path = Path(os.environ.get("HERDR_STATUS_GROK_AUTH", grok_home / "auth.json"))

    def fetch():
        access_token = grok_access_token(auth_path)
        payload = request_json(
            os.environ.get(
                "HERDR_STATUS_GROK_USAGE_URL",
                "https://cli-chat-proxy.grok.com/v1/billing?format=credits",
            ),
            {
                "Authorization": f"Bearer {access_token}",
                "User-Agent": "grok/1",
            },
        )
        payload = payload.get("config") or payload
        period = payload.get("currentPeriod") or {}
        if period.get("type") != "USAGE_PERIOD_TYPE_WEEKLY":
            raise ValueError
        return {
            "used": payload["creditUsagePercent"],
            "reset_at": parse_timestamp(period.get("end") or payload["billingPeriodEnd"]),
        }

    return cache_record("grok", auth_path, fetch)


def claude_usage():
    claude_home = Path(os.environ.get("CLAUDE_CONFIG_DIR", Path.home() / ".claude"))
    auth_path = Path(
        os.environ.get("HERDR_STATUS_CLAUDE_AUTH", claude_home / ".credentials.json")
    )

    ccstatusline_cache = Path(
        os.environ.get(
            "HERDR_STATUS_CLAUDE_USAGE_CACHE",
            Path(os.environ.get("XDG_CACHE_HOME", Path.home() / ".cache"))
            / "ccstatusline"
            / "usage.json",
        )
    )

    def fetch():
        try:
            auth = read_json(auth_path)["claudeAiOauth"]
            payload = request_json(
                os.environ.get(
                    "HERDR_STATUS_CLAUDE_USAGE_URL",
                    "https://api.anthropic.com/api/oauth/usage",
                ),
                {
                    "Authorization": f"Bearer {auth['accessToken']}",
                    "anthropic-beta": "oauth-2025-04-20",
                    "anthropic-version": "2023-06-01",
                    "User-Agent": "claude-code/2",
                },
            )
            weekly = payload["seven_day"]
            used = weekly["utilization"]
            reset_at = parse_timestamp(weekly["resets_at"])
        except Exception:
            cached = read_json(ccstatusline_cache)
            used = cached["weeklyUsage"]
            reset_at = parse_timestamp(cached["weeklyResetAt"])
        return {
            "used": used,
            "reset_at": reset_at,
        }

    return cache_record("claude", auth_path, fetch)

try:
    if provider == "codex":
        record = codex_usage()
    elif provider == "grok":
        record = grok_usage()
    elif provider == "claude":
        record = claude_usage()
    else:
        raise ValueError
    used = record["used"]
    if not isinstance(used, (int, float)) or isinstance(used, bool):
        raise ValueError
    seconds = max(0, int(float(record["reset_at"]) - now))
except Exception:
    sys.exit(0)

minutes = seconds // 60
days, minutes = divmod(minutes, 24 * 60)
hours, minutes = divmod(minutes, 60)
parts = []
if days:
    parts.append(f"{days}d")
if hours:
    parts.append(f"{hours}h")
if minutes or not parts:
    parts.append(f"{minutes}m")

banked = record.get("banked")
banked_suffix = ""
if isinstance(banked, (int, float)) and not isinstance(banked, bool) and banked > 0:
    banked_suffix = f" +{int(banked)}b"
icons = {"codex": "", "grok": "󰚩", "claude": ""}
print(f"{icons[provider]} {used:g}% -{''.join(parts)}{banked_suffix}")
PY
}

prefix_cpu() {
	value=$(mod_cpu) || return 0
	[ -n "$value" ] || return 0
	printf ' %s\n' "$value"
}

prefix_ram() {
	value=$(mod_ram) || return 0
	[ -n "$value" ] || return 0
	printf ' %s\n' "$value"
}

usage() {
	printf 'usage: %s application|codex|grok|claude|cpu|ram|net|uptime\n' "${0##*/}" >&2
	return 2
}

module=${1:-}
case "$module" in
application)
	mod_application
	;;
codex)
	mod_ai_usage codex
	;;
grok)
	mod_ai_usage grok
	;;
claude)
	mod_ai_usage claude
	;;
cpu)
	prefix_cpu
	;;
ram)
	prefix_ram
	;;
net)
	mod_net
	;;
uptime)
	mod_uptime
	;;
'' | -h | --help)
	usage
	exit 2
	;;
*)
	printf 'unknown module: %s\n' "$module" >&2
	usage
	exit 2
	;;
esac

#!/bin/sh
# Tab-bar modules matching tmux status-right: application, cpu, ram, net, uptime.
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
	printf '󰤨 ↓ %s ↑ %s\n' "$rx_h" "$tx_h"
}

format_uptime() {
	awk -v s="$1" 'BEGIN {
		if (s < 0) s = 0
		s = int(s)
		days = int(s / 86400)
		hours = int((s % 86400) / 3600)
		mins = int((s % 3600) / 60)
		secs = s % 60
		if (days > 0 && mins > 0) printf "%dd %dh %dm\n", days, hours, mins
		else if (days > 0) printf "%dd %dh\n", days, hours
		else if (hours > 0) printf "%dh %dm\n", hours, mins
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
	printf 'usage: %s application|cpu|ram|net|uptime\n' "${0##*/}" >&2
	return 2
}

module=${1:-}
case "$module" in
application)
	mod_application
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

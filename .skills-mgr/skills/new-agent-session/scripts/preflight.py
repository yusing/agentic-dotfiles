#!/usr/bin/env python3
"""Read-only session discovery, shared by single and batched launches."""

import argparse
from concurrent.futures import ThreadPoolExecutor
import json
import os
from pathlib import Path
import re
import shutil
import subprocess
import sys

# Installed syntax the launch steps rely on; a group's usage is printed only on mismatch.
REQUIRED_CLI = {
    "worktree": {"create": ["--workspace", "--branch", "--base", "--path", "--label", "--no-focus"], "remove": ["--workspace"]},
    "pane": {"run": [], "read": ["--source", "--lines"], "process-info": ["--pane"]},
    "agent": {
        "start": ["--kind", "--pane"],
        "rename": [],
        "prompt": ["--wait", "--until", "--timeout"],
        "wait": ["--until", "--timeout"],
        "get": [],
        "read": ["--source", "--lines"],
        "explain": [],
    },
}
DIRTY_LIMIT = 40


def run(argv, cwd):
    result = subprocess.run(argv, cwd=cwd, capture_output=True, text=True, timeout=30)
    if result.returncode == 2 and argv in (["herdr", "worktree"], ["herdr", "pane"], ["herdr", "agent"]):
        usage = result.stdout + result.stderr
        if "commands:" in usage:
            return usage.strip()
    if result.returncode:
        detail = result.stderr.strip()
        for raw in (result.stderr, result.stdout):
            try:
                error = json.loads(raw).get("error", {})
                if error:
                    detail = f"{error.get('code', 'error')}: {error.get('message', '')}"
                    break
            except (ValueError, AttributeError):
                pass
        raise RuntimeError(f"{argv[0]} {' '.join(argv[1:3])}: exit {result.returncode}" + (f": {detail[:1200]}" if detail else ""))
    return result.stdout.rstrip()


def cli_mismatches(group, usage):
    lines = {}
    for line in usage.splitlines():
        words = line.split()
        if words[:2] == ["herdr", group] and len(words) > 2:
            lines[words[2]] = lines.get(words[2], "") + " " + line
    missing = []
    for sub, flags in REQUIRED_CLI[group].items():
        if sub not in lines:
            missing.append(f"herdr {group} {sub}")
            continue
        missing += [f"herdr {group} {sub} {flag}" for flag in flags if not re.search(rf"{flag}(?![\w-])", lines[sub])]
    return missing


def discover(cwd, env, runner=run):
    if env.get("HERDR_ENV") != "1":
        raise ValueError("Not inside a Herdr-managed pane (HERDR_ENV must be 1).")
    pane = env.get("HERDR_PANE_ID")
    workspace = env.get("HERDR_WORKSPACE_ID")
    if not pane or not workspace:
        raise ValueError("Missing caller pane or workspace context.")
    queries = {
        "base_commit": ["git", "rev-parse", "HEAD"],
        "dirty_status": ["git", "status", "--short"],
        "worktrees": ["herdr", "worktree", "list", "--workspace", workspace],
        "processes": ["herdr", "pane", "process-info", "--pane", pane],
        "agents": ["herdr", "agent", "list"],
        **{f"{group}_usage": ["herdr", group] for group in REQUIRED_CLI},
    }
    values, errors = {}, []
    with ThreadPoolExecutor(max_workers=len(queries)) as pool:
        jobs = {key: pool.submit(runner, argv, cwd) for key, argv in queries.items()}
        for key, job in jobs.items():
            try:
                values[key] = job.result()
            except (OSError, RuntimeError, subprocess.TimeoutExpired) as exc:
                errors.append(f"{key}: {exc}")
    context = {"cwd": str(cwd), "caller_pane": pane, "caller_workspace": workspace}
    if "base_commit" in values:
        context["base_commit"] = values["base_commit"]
    if "dirty_status" in values:
        dirty = values["dirty_status"].splitlines()
        context["dirty_status"] = dirty[:DIRTY_LIMIT] + ([f"... {len(dirty) - DIRTY_LIMIT} more"] if len(dirty) > DIRTY_LIMIT else [])
    for key in ("worktrees", "processes", "agents"):
        if key not in values:
            continue
        try:
            payload = json.loads(values[key])["result"]
            if key == "worktrees":
                context["source_workspace_id"] = payload["source"]["source_workspace_id"]
                context["source_checkout_path"] = payload["source"].get("source_checkout_path")
                context["worktrees"] = [
                    {
                        **{k: w[k] for k in ("path", "branch", "label", "open_workspace_id") if w.get(k) is not None},
                        **{k: True for k in ("is_detached", "is_prunable", "is_bare") if w.get(k)},
                    }
                    for w in payload["worktrees"]
                ]
            elif key == "agents":
                agents = payload["agents"]
                caller = next((a for a in agents if a.get("pane_id") == context["caller_pane"]), {})
                context["caller_kind"] = caller.get("agent")
                context["taken_agent_names"] = sorted(a["name"] for a in agents if a.get("name"))
            else:
                context["caller_pane"] = payload["process_info"].get("pane_id", pane)
                processes = payload["process_info"]["foreground_processes"]
                mekugi = next((p for p in processes if p.get("name") == "mekugi"), None)
                context["caller_uses_mekugi"] = mekugi is not None
                if mekugi:
                    process_executable = Path(f"/proc/{mekugi['pid']}/exe")
                    target = os.readlink(process_executable)
                    executable = str(process_executable) if target.endswith(" (deleted)") else str(process_executable.resolve(strict=True))
                else:
                    executable = shutil.which("mekugi")
                if executable and not os.access(executable, os.X_OK):
                    raise ValueError("Caller Mekugi executable cannot be reused.")
                context["mekugi_executable"] = executable
        except (KeyError, TypeError, ValueError, OSError) as exc:
            errors.append(f"{key}: {exc}")
    mismatched = {}
    for group in REQUIRED_CLI:
        if f"{group}_usage" in values:
            missing = cli_mismatches(group, values[f"{group}_usage"])
            if missing:
                mismatched[group] = values[f"{group}_usage"]
                errors.append(f"cli: installed herdr lacks {', '.join(missing)}")
    return context, mismatched, errors


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--cwd", required=True, type=Path, help="Caller checkout, passed before skills-mgr changes directory.")
    parser.add_argument("--with-skill", action="store_true", help="Also print new-agent-session guidance, for callers that have not loaded it.")
    args = parser.parse_args()
    try:
        context, mismatched, errors = discover(args.cwd.resolve(strict=True), os.environ)
    except (ValueError, OSError) as exc:
        print(str(exc), file=sys.stderr)
        return 1
    if args.with_skill:
        print("## new-agent-session guidance")
        print(Path(__file__).resolve().parents[1].joinpath("SKILL.md").read_text())
    print("## Session preflight")
    for key, value in context.items():
        print(f"{key}: {json.dumps(value)}")
    print(f"cli: {'mismatch' if mismatched else 'ok'}")
    for group, usage in mismatched.items():
        print(f"## Installed CLI: herdr {group}")
        print(usage)
    for error in errors:
        print(error, file=sys.stderr)
    return int(bool(errors))


if __name__ == "__main__":
    sys.exit(main())

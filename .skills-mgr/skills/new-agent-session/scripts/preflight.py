#!/usr/bin/env python3
"""Read-only session discovery, shared by single and batched launches."""

import argparse
from concurrent.futures import ThreadPoolExecutor
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys


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
    return result.stdout.strip()


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
        "help": ["herdr", "--help"],
        "worktree_help": ["herdr", "worktree"],
        "pane_help": ["herdr", "pane"],
        "agent_help": ["herdr", "agent"],
        "create_help": ["herdr", "worktree", "create", "--help"],
        "prompt_help": ["herdr", "agent", "prompt", "--help"],
        "wait_help": ["herdr", "agent", "wait", "--help"],
    }
    values, errors = {}, []
    with ThreadPoolExecutor(max_workers=8) as pool:
        jobs = {key: pool.submit(runner, argv, cwd) for key, argv in queries.items()}
        for key, job in jobs.items():
            try:
                values[key] = job.result()
            except (OSError, RuntimeError, subprocess.TimeoutExpired) as exc:
                errors.append(f"{key}: {exc}")
    context = {"cwd": str(cwd), "caller_pane": pane, "caller_workspace": workspace}
    for key in ("base_commit", "dirty_status"):
        if key in values:
            context[key] = values[key]
    for key in ("worktrees", "processes", "agents"):
        if key not in values:
            continue
        try:
            payload = json.loads(values[key])["result"]
            if key == "worktrees":
                context["source"] = payload["source"]
                context["worktrees"] = payload["worktrees"]
            elif key == "agents":
                agents = payload["agents"]
                caller = next((a for a in agents if a.get("pane_id") == context["caller_pane"]), {})
                context["caller_kind"] = caller.get("agent")
                context["live_agents"] = [
                    {k: a[k] for k in ("name", "pane_id", "workspace_id", "agent", "agent_status") if k in a}
                    for a in agents
                ]
            else:
                context["caller_pane"] = payload["process_info"].get("pane_id", pane)
                processes = payload["process_info"]["foreground_processes"]
                mekugi = next((p for p in processes if p.get("name") == "mekugi"), None)
                context["caller_uses_mekugi"] = mekugi is not None
                executable = str(Path(f"/proc/{mekugi['pid']}/exe").resolve(strict=True)) if mekugi else shutil.which("mekugi")
                if executable and (executable.endswith(" (deleted)") or not os.access(executable, os.X_OK)):
                    raise ValueError("Caller Mekugi executable cannot be reused.")
                context["mekugi_executable"] = executable
                context["mekugi_yolo_inherited"] = mekugi is not None
        except (KeyError, TypeError, ValueError, OSError) as exc:
            errors.append(f"{key}: {exc}")
    context["preflight_ok"] = not errors
    return context, {k: v for k, v in values.items() if k.endswith("help")}, errors


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--cwd", required=True, type=Path, help="Caller checkout, passed before skills-mgr changes directory.")
    parser.add_argument("--context-only", action="store_true", help="Omit guidance already loaded in this context.")
    args = parser.parse_args()
    try:
        context, help_text, errors = discover(args.cwd.resolve(strict=True), os.environ)
    except (ValueError, OSError) as exc:
        print(str(exc), file=sys.stderr)
        return 1
    if not args.context_only:
        print("## new-agent-session guidance")
        print(Path(__file__).resolve().parents[1].joinpath("SKILL.md").read_text())
        try:
            print("## herdr guidance")
            print(run(["skills-mgr", "get", "herdr"], args.cwd))
        except (OSError, RuntimeError, subprocess.TimeoutExpired) as exc:
            errors.append(f"herdr guidance: {exc}")
    context["preflight_ok"] = not errors
    print("## Session preflight")
    print(json.dumps(context, indent=2))
    for key, value in help_text.items():
        print(f"## Installed CLI: {key}")
        print(value)
    for error in errors:
        print(error, file=sys.stderr)
    return int(bool(errors))


if __name__ == "__main__":
    sys.exit(main())

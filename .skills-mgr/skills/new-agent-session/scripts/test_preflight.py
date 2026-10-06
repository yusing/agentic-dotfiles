#!/usr/bin/env python3
import importlib.util
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
import unittest
from unittest.mock import patch

spec = importlib.util.spec_from_file_location("preflight", Path(__file__).with_name("preflight.py"))
preflight = importlib.util.module_from_spec(spec)
spec.loader.exec_module(preflight)

USAGE = {
    "worktree": """herdr worktree commands:
  herdr worktree list [--workspace ID | --cwd PATH] [--trust-repository]
  herdr worktree create [--workspace ID | --cwd PATH] [--branch NAME] [--base REF] [--path PATH] [--label TEXT] [--focus] [--no-focus]
  herdr worktree remove --workspace ID [--force]""",
    "pane": """herdr pane commands:
  herdr pane process-info [--pane ID|--current]
  herdr pane read <pane_id> [--source visible|recent|recent-unwrapped] [--lines N]
  herdr pane run <pane_id> <command>""",
    "agent": """herdr agent commands:
  herdr agent list
  herdr agent get <target>
  herdr agent read <target> [--source visible|recent] [--lines N]
  herdr agent prompt <target> <text> [--wait] [--until STATUS]... [--timeout MS]
  herdr agent rename <target> <name>|--clear
  herdr agent wait <target> [--until STATUS]... [--timeout MS]
  herdr agent start <name> --kind KIND --pane ID [--timeout MS] [-- <agent-args...>]
  herdr agent explain <target> [--json]""",
}


class PreflightTests(unittest.TestCase):
    def runner(self, argv, cwd):
        self.calls.append((argv, cwd))
        if argv[:3] == ["git", "rev-parse", "HEAD"]:
            return "base"
        if argv[:2] == ["git", "status"]:
            return " M unrelated.txt"
        if argv[:3] == ["herdr", "worktree", "list"]:
            worktree = {"path": "/caller", "branch": "main", "is_bare": False, "is_prunable": False}
            return json.dumps({"result": {"source": {"source_workspace_id": "source", "repo_key": "noise"}, "worktrees": [worktree]}})
        if argv[:3] == ["herdr", "pane", "process-info"]:
            return json.dumps({"result": {"process_info": {"foreground_processes": []}}})
        if argv == ["herdr", "agent", "list"]:
            agents = [{"pane_id": "caller", "agent": "codex", "argv": ["secret"]}, {"pane_id": "other", "name": "mekugi"}]
            return json.dumps({"result": {"agents": agents}})
        if len(argv) == 2 and argv[1] in USAGE:
            return USAGE[argv[1]]
        raise AssertionError(f"unexpected command {argv}")

    def setUp(self):
        self.calls = []
        self.env = {"HERDR_ENV": "1", "HERDR_PANE_ID": "caller", "HERDR_WORKSPACE_ID": "inherited"}

    def test_caller_checkout_and_compact_context_without_mutations_or_argv(self):
        cwd = Path("/caller checkout")
        with patch.object(preflight.shutil, "which", return_value=sys.executable):
            context, mismatched, errors = preflight.discover(cwd, self.env, self.runner)
        self.assertEqual(errors, [])
        self.assertEqual(mismatched, {})
        self.assertEqual(context["cwd"], str(cwd))
        self.assertEqual(context["base_commit"], "base")
        self.assertEqual(context["dirty_status"], [" M unrelated.txt"])
        self.assertEqual(context["source_workspace_id"], "source")
        self.assertEqual(context["worktrees"], [{"path": "/caller", "branch": "main"}])
        self.assertEqual(context["caller_kind"], "codex")
        self.assertEqual(context["taken_agent_names"], ["mekugi"])
        self.assertFalse(context["caller_uses_mekugi"])
        self.assertNotIn("secret", json.dumps(context))
        self.assertNotIn("noise", json.dumps(context))
        for argv, actual_cwd in self.calls:
            self.assertEqual(actual_cwd, cwd)
            self.assertNotIn("create", argv)
            self.assertNotIn("prompt", argv)

    def test_cli_mismatch_reports_missing_syntax_and_its_group_usage(self):
        def drifted(argv, cwd):
            if argv == ["herdr", "agent"]:
                return USAGE["agent"].replace(" [--until STATUS]... [--timeout MS]\n  herdr agent rename", "\n  herdr agent rename")
            return self.runner(argv, cwd)
        context, mismatched, errors = preflight.discover(Path("/caller"), self.env, drifted)
        self.assertEqual(list(mismatched), ["agent"])
        self.assertEqual(errors, ["cli: installed herdr lacks herdr agent prompt --until, herdr agent prompt --timeout"])
        self.assertEqual(context["base_commit"], "base")

    def test_live_replaced_mekugi_binary_is_reusable_through_proc(self):
        with tempfile.TemporaryDirectory(prefix="session-preflight-") as directory:
            executable = Path(directory) / "mekugi"
            shutil.copy2(shutil.which("sleep"), executable)
            process = subprocess.Popen([str(executable), "30"])
            try:
                executable.unlink()
                def replaced(argv, cwd):
                    if argv[:3] == ["herdr", "pane", "process-info"]:
                        return json.dumps({"result": {"process_info": {"foreground_processes": [{"name": "mekugi", "pid": process.pid, "argv": ["mekugi", "codex"]}]}}})
                    return self.runner(argv, cwd)
                context, _, errors = preflight.discover(Path("/caller"), self.env, replaced)
                self.assertEqual(errors, [])
                self.assertTrue(context["caller_uses_mekugi"])
                self.assertEqual(context["mekugi_executable"], f"/proc/{process.pid}/exe")
                subprocess.run([context["mekugi_executable"], "0"], check=True, timeout=5)
            finally:
                process.terminate()
                process.wait(timeout=5)

    def test_live_unreplaced_mekugi_keeps_resolved_executable(self):
        def live(argv, cwd):
            if argv[:3] == ["herdr", "pane", "process-info"]:
                return json.dumps({"result": {"process_info": {"foreground_processes": [{"name": "mekugi", "pid": os.getpid(), "argv": ["mekugi", "codex"]}]}}})
            return self.runner(argv, cwd)
        context, _, errors = preflight.discover(Path("/caller"), self.env, live)
        self.assertEqual(errors, [])
        self.assertEqual(context["mekugi_executable"], str(Path(f"/proc/{os.getpid()}/exe").resolve(strict=True)))

    def test_main_wrapper_flags_exclude_native_arguments(self):
        flags = ["--debug", "--ansi-faint=off", "--grok-auth-file", "codex", "--capture-output=logs/capture.jsonl", "--journal-compaction", "slice"]
        def live(argv, cwd):
            if argv[:3] == ["herdr", "pane", "process-info"]:
                process = {"name": "mekugi", "pid": os.getpid(), "argv": ["mekugi", *flags, "codex", "--yolo", "-m", "native-secret", "resume", "--last"]}
                return json.dumps({"result": {"process_info": {"foreground_processes": [process]}}})
            if argv[-1:] == ["--help"]:
                return "  -debug\n  -ansi-faint string\n  -grok-auth-file string\n  -capture-output string\n  -journal-compaction string\n"
            return self.runner(argv, cwd)
        context, _, errors = preflight.discover(Path("/caller"), self.env, live)
        self.assertEqual(errors, [])
        self.assertEqual(context["mekugi_flags"], ["--debug", "--ansi-faint=off", "--journal-compaction", "slice"])
        self.assertNotIn("native-secret", json.dumps(context))
        self.assertEqual(preflight.mekugi_flags(["mekugi", "--", "codex", "resume"], ""), [])
        self.assertEqual(preflight.mekugi_flags(["mekugi", "--yolo", "resume"], "  -debug\n"), [])

    def test_failed_wrapper_help_preserves_partial_discovery(self):
        for failure in [RuntimeError("help fixture failed"), subprocess.TimeoutExpired("mekugi --help", 30)]:
            with self.subTest(failure=type(failure).__name__):
                def failing(argv, cwd):
                    if argv[:3] == ["herdr", "pane", "process-info"]:
                        process = {"name": "mekugi", "pid": os.getpid(), "argv": ["mekugi", "--debug", "codex"]}
                        return json.dumps({"result": {"process_info": {"foreground_processes": [process]}}})
                    if argv[-1:] == ["--help"]:
                        raise failure
                    return self.runner(argv, cwd)
                context, _, errors = preflight.discover(Path("/caller"), self.env, failing)
                self.assertEqual(context["base_commit"], "base")
                self.assertEqual(context["caller_kind"], "codex")
                self.assertNotIn("mekugi_flags", context)
                self.assertEqual(len(errors), 1)
                self.assertTrue(errors[0].startswith("processes:"))

    def test_flag_prefix_does_not_satisfy_requirement(self):
        usage = USAGE["worktree"].replace("[--no-focus]", "[--no-focus-ring]")
        self.assertEqual(preflight.cli_mismatches("worktree", usage), ["herdr worktree create --no-focus"])

    def test_failed_probe_preserves_other_results_and_attempts(self):
        def failing(argv, cwd):
            if argv[:3] == ["herdr", "worktree", "list"]:
                raise RuntimeError("unavailable")
            return self.runner(argv, cwd)
        context, _, errors = preflight.discover(Path("/caller"), self.env, failing)
        self.assertEqual(context["base_commit"], "base")
        self.assertEqual(context["caller_kind"], "codex")
        self.assertEqual(errors, ["worktrees: unavailable"])
        self.assertTrue(any(argv == ["herdr", "agent"] for argv, _ in self.calls))

    def test_outside_herdr_does_not_inspect_any_session(self):
        with self.assertRaises(ValueError):
            preflight.discover(Path("/caller"), {}, self.runner)
        self.assertEqual(self.calls, [])

    def test_moved_pane_matches_resolved_live_identity(self):
        def moved(argv, cwd):
            if argv[:3] == ["herdr", "pane", "process-info"]:
                return json.dumps({"result": {"process_info": {"pane_id": "moved", "foreground_processes": []}}})
            if argv == ["herdr", "agent", "list"]:
                return json.dumps({"result": {"agents": [{"pane_id": "moved", "agent": "codex"}]}})
            return self.runner(argv, cwd)
        context, _, errors = preflight.discover(Path("/caller"), self.env, moved)
        self.assertEqual(errors, [])
        self.assertEqual(context["caller_pane"], "moved")
        self.assertEqual(context["caller_kind"], "codex")

    def test_failed_probe_keeps_bounded_structured_diagnostic(self):
        error = json.dumps({"error": {"code": "workspace_not_found", "message": "Missing caller workspace"}})
        result = subprocess.CompletedProcess([], 1, "", error)
        with patch.object(preflight.subprocess, "run", return_value=result):
            with self.assertRaisesRegex(RuntimeError, "workspace_not_found: Missing caller workspace"):
                preflight.run(["herdr", "worktree", "list"], Path("/caller"))

    def test_group_usage_exit_two_is_evidence_not_failure(self):
        result = subprocess.CompletedProcess([], 2, "", "herdr agent commands:\nusage")
        with patch.object(preflight.subprocess, "run", return_value=result):
            self.assertIn("commands:", preflight.run(["herdr", "agent"], Path("/caller")))
            with self.assertRaises(RuntimeError):
                preflight.run(["herdr", "agent", "list"], Path("/caller"))

    def test_output_keeps_leading_status_column(self):
        result = subprocess.CompletedProcess([], 0, " M a\n?? b\n", "")
        with patch.object(preflight.subprocess, "run", return_value=result):
            self.assertEqual(preflight.run(["git", "status", "--short"], Path("/caller")), " M a\n?? b")


if __name__ == "__main__":
    unittest.main()

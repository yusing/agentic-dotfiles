#!/usr/bin/env python3
import importlib.util
import json
from pathlib import Path
import subprocess
import sys
import unittest
from unittest.mock import patch

spec = importlib.util.spec_from_file_location("preflight", Path(__file__).with_name("preflight.py"))
preflight = importlib.util.module_from_spec(spec)
spec.loader.exec_module(preflight)


class PreflightTests(unittest.TestCase):
    def runner(self, argv, cwd):
        self.calls.append((argv, cwd))
        if argv[:3] == ["git", "rev-parse", "HEAD"]:
            return "base"
        if argv[:2] == ["git", "status"]:
            return " M unrelated.txt"
        if argv[:3] == ["herdr", "worktree", "list"]:
            return json.dumps({"result": {"source": {"source_workspace_id": "source"}, "worktrees": []}})
        if argv[:3] == ["herdr", "pane", "process-info"]:
            return json.dumps({"result": {"process_info": {"foreground_processes": []}}})
        if argv == ["herdr", "agent", "list"]:
            return json.dumps({"result": {"agents": [{"pane_id": "caller", "agent": "codex", "argv": ["secret"]}]}})
        return "help"

    def setUp(self):
        self.calls = []
        self.env = {"HERDR_ENV": "1", "HERDR_PANE_ID": "caller", "HERDR_WORKSPACE_ID": "inherited"}

    def test_caller_checkout_and_context_without_mutations_or_argv(self):
        cwd = Path("/caller checkout")
        with patch.object(preflight.shutil, "which", return_value=sys.executable):
            context, help_text, errors = preflight.discover(cwd, self.env, self.runner)
        self.assertEqual(errors, [])
        self.assertEqual(context["cwd"], str(cwd))
        self.assertEqual(context["base_commit"], "base")
        self.assertEqual(context["source"]["source_workspace_id"], "source")
        self.assertEqual(context["caller_kind"], "codex")
        self.assertFalse(context["mekugi_yolo_inherited"])
        self.assertNotIn("secret", json.dumps(context))
        self.assertTrue(help_text)
        for argv, actual_cwd in self.calls:
            self.assertEqual(actual_cwd, cwd)
            if "create" in argv or "prompt" in argv:
                self.assertIn("--help", argv)

    def test_failed_probe_preserves_other_results_and_attempts(self):
        def failing(argv, cwd):
            if argv[:3] == ["herdr", "worktree", "list"]:
                raise RuntimeError("unavailable")
            return self.runner(argv, cwd)
        context, _, errors = preflight.discover(Path("/caller"), self.env, failing)
        self.assertFalse(context["preflight_ok"])
        self.assertEqual(context["base_commit"], "base")
        self.assertEqual(context["caller_kind"], "codex")
        self.assertEqual(errors, ["worktrees: unavailable"])
        self.assertTrue(any(argv == ["herdr", "agent", "wait", "--help"] for argv, _ in self.calls))

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


if __name__ == "__main__":
    unittest.main()

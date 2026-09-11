#!/usr/bin/python3
"""Focused tests for session-usage metering."""

from __future__ import annotations

import io
import json
import os
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from session_usage import (
    FALLBACK_USD_PER_MILLION,
    cost_for_request,
    show_to_user,
    fallback_rates,
    main,
    match_openrouter_model,
    meter_session,
    per_token,
    render,
    resolve_rates,
    status_text,
    uncached_input,
)


def write_jsonl(path: Path, events: list[dict]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text("".join(json.dumps(event) + "\n" for event in events), encoding="utf-8")


def usage_event(usage: dict[str, int], thread_id: str) -> dict:
    return {
        "type": "token_usage_record",
        "payload": {
            "thread_id": thread_id,
            "usage": usage,
            "thread_token_usage": usage,
        },
    }


def command_event(command: str, secs: int, nanos: int = 0) -> dict:
    return {
        "type": "event_msg",
        "payload": {
            "type": "item_completed",
            "item": {
                "type": "CommandExecution",
                "command": ["/usr/bin/bash", "-lc", command],
                "duration": {"secs": secs, "nanos": nanos},
            },
        },
    }


class SessionUsageTest(unittest.TestCase):
    def setUp(self) -> None:
        self.temp = tempfile.TemporaryDirectory()
        self.home = Path(self.temp.name)
        self.day = self.home / "sessions" / "2026" / "09" / "08"

    def tearDown(self) -> None:
        self.temp.cleanup()

    def write_tree(self) -> Path:
        root_id = "01root"
        child_id = "01child"
        root = self.day / f"rollout-2026-09-08T00-00-00-{root_id}.jsonl"
        child = self.day / f"rollout-2026-09-08T00-00-01-{child_id}.jsonl"
        write_jsonl(
            root,
            [
                {
                    "type": "session_meta",
                    "payload": {
                        "id": root_id,
                        "session_id": root_id,
                        "thread_source": "user",
                    },
                },
                {
                    "type": "turn_context",
                    "payload": {"model": "gpt-6-astra"},
                },
                usage_event(
                    {
                        "input_tokens": 1000,
                        "cached_input_tokens": 400,
                        "cache_write_input_tokens": 50,
                        "output_tokens": 100,
                        "reasoning_output_tokens": 30,
                        "total_tokens": 1100,
                    },
                    root_id,
                ),
                command_event("rg foo", secs=0, nanos=500_000_000),
                command_event("cargo test", secs=12),
            ],
        )
        write_jsonl(
            child,
            [
                {
                    "type": "session_meta",
                    "payload": {
                        "id": child_id,
                        "session_id": root_id,
                        "parent_thread_id": root_id,
                        "agent_path": "/root/explorer",
                        "agent_nickname": "Maxwell",
                        "agent_role": "explorer",
                        "thread_source": "subagent",
                    },
                },
                {
                    "type": "turn_context",
                    "payload": {"model": "gpt-6-astra"},
                },
                usage_event(
                    {
                        "input_tokens": 500,
                        "cached_input_tokens": 200,
                        "cache_write_input_tokens": 0,
                        "output_tokens": 40,
                        "reasoning_output_tokens": 10,
                        "total_tokens": 540,
                    },
                    child_id,
                ),
                command_event("cat README.md", secs=3),
            ],
        )
        return root

    def test_tokens_commands_and_fallback_usd(self) -> None:
        root = self.write_tree()
        agents, commands, notes = meter_session(root, self.home, fetcher=None)
        self.assertEqual([agent.label for agent in agents], ["main", "/root/explorer"])
        self.assertEqual(agents[0].role, "main")
        self.assertEqual(agents[1].role, "explorer")
        self.assertEqual(agents[0].usage["input_tokens"], 1000)
        self.assertEqual(uncached_input(agents[0].usage), 600)
        self.assertEqual(agents[1].usage["cache_write_input_tokens"], 0)
        total_in = sum(agent.usage["input_tokens"] for agent in agents)
        self.assertEqual(total_in, 1500)

        self.assertEqual([row.command for row in commands], ["cargo test", "cat README.md", "rg foo"])
        self.assertEqual(commands[0].agent, "main")
        self.assertEqual(commands[1].agent, "/root/explorer")
        self.assertAlmostEqual(commands[0].seconds, 12.0)
        self.assertAlmostEqual(commands[2].seconds, 0.5)

        rates = fallback_rates("gpt-6-astra")
        assert rates is not None
        expected_main = cost_for_request(agents[0].usage, rates)
        expected_child = cost_for_request(agents[1].usage, rates)
        self.assertAlmostEqual(agents[0].usd or 0, expected_main)
        self.assertAlmostEqual(agents[1].usd or 0, expected_child)
        self.assertTrue(any(note.startswith("gpt-6-astra priced from fallback:") for note in notes))

        table = render(agents, commands, notes)
        self.assertIn("| total", table)
        self.assertIn("cargo test", table)
        self.assertIn("/root/explorer", table)
        self.assertIn("Usage method: token_usage_record.", table)

    def test_uncached_and_reasoning_billing(self) -> None:
        rates = fallback_rates("gpt-6-astra")
        assert rates is not None
        usage = {
            "input_tokens": 1000,
            "cached_input_tokens": 400,
            "cache_write_input_tokens": 50,
            "output_tokens": 100,
            "reasoning_output_tokens": 30,
            "total_tokens": 1100,
        }
        cost = cost_for_request(usage, rates)
        table = FALLBACK_USD_PER_MILLION["gpt-6-astra"]
        expected = (
            550 * per_token(table["prompt"])
            + 400 * per_token(table["input_cache_read"])
            + 50 * per_token(table["input_cache_write"])
            + 100 * per_token(table["completion"])
        )
        self.assertAlmostEqual(cost, expected)
        self.assertEqual(uncached_input(usage), 600)

    def test_long_context_override(self) -> None:
        rates = fallback_rates("gpt-6-astra")
        assert rates is not None
        usage = {
            "input_tokens": 300_000,
            "cached_input_tokens": 100_000,
            "cache_write_input_tokens": 0,
            "output_tokens": 10,
            "reasoning_output_tokens": 0,
            "total_tokens": 300_010,
        }
        cost = cost_for_request(usage, rates)
        table = FALLBACK_USD_PER_MILLION["gpt-6-astra"]
        expected = (
            200_000 * per_token(table["long_prompt"])
            + 100_000 * per_token(table["long_input_cache_read"])
            + 10 * per_token(table["long_completion"])
        )
        self.assertAlmostEqual(cost, expected)

    def test_openrouter_match_skips_batch_and_pro(self) -> None:
        catalog = [
            {"id": "openai/gpt-6-astra:batch"},
            {"id": "openai/gpt-6-astra-pro"},
            {"id": "openai/gpt-6-astra", "pricing": {"prompt": "0.00001"}},
        ]
        match = match_openrouter_model("gpt-6-astra", catalog)
        assert match is not None
        self.assertEqual(match["id"], "openai/gpt-6-astra")

    def test_openrouter_rates_used_when_catalog_hits(self) -> None:
        root = self.write_tree()

        def fetch(query: str | None) -> list[dict]:
            return [
                {
                    "id": "openai/gpt-6-astra",
                    "pricing": {
                        "prompt": "0.00001",
                        "completion": "0.00005",
                        "input_cache_read": "0.000001",
                        "input_cache_write": "0.0000125",
                    },
                }
            ]

        agents, _, notes = meter_session(root, self.home, fetcher=fetch)
        self.assertTrue(any("openrouter:openai/gpt-6-astra" in note for note in notes))
        self.assertAlmostEqual(agents[0].usd or 0, 0.011525)

    def test_grok_prefix_pricing(self) -> None:
        item = {"id": "x-ai/grok-4.6", "pricing": {"prompt": "0.000002"}}
        for model in ("grok:grok-4.6", "grok-4.6", "x-ai/grok-4.6", " GROK:GROK-4.6 "):
            with self.subTest(model=model):
                queries = []

                def fetch(query):
                    queries.append(query)
                    return [item] if query == "grok-4.6" else []

                rates = resolve_rates(model, fetch, {})
                self.assertIsNotNone(rates)
                self.assertEqual(rates.model_id, "x-ai/grok-4.6")
                self.assertEqual(queries, ["grok-4.6"])
        self.assertIsNone(match_openrouter_model("grok:grok-4.6:free", [item]))

    def test_cache_writes_preserved_in_all_usage_sources(self) -> None:
        usage = {
            "input_tokens": 1000, "cached_input_tokens": 400,
            "cache_write_input_tokens": 50, "output_tokens": 100,
            "total_tokens": 1100,
        }
        sources = [
            usage_event(usage, "root"),
            {"type": "event_msg", "payload": {
                "type": "token_count", "info": {
                    "orchestrated_role_token_usage": [{"usage": usage}],
                },
            }},
            {"type": "event_msg", "payload": {
                "type": "token_count", "info": {"total_token_usage": usage},
            }},
        ]
        root = self.day / "root.jsonl"
        for source in sources:
            with self.subTest(source=source):
                write_jsonl(root, [
                    {"type": "session_meta", "payload": {"id": "root"}},
                    {"type": "turn_context", "payload": {"model": "gpt-6-astra"}},
                    source,
                ])
                agents, commands, notes = meter_session(root, self.home, fetcher=None)
                self.assertEqual(agents[0].usage["cache_write_input_tokens"], 50)
                self.assertAlmostEqual(agents[0].usd, 0.011525)
                self.assertIn("Zero may mean", render(agents, commands, notes))

    def test_missing_thread(self) -> None:
        from session_usage import find_session

        with self.assertRaises(SystemExit):
            find_session("missing", self.home)

    def test_status_text_is_short(self) -> None:
        root = self.write_tree()
        agents, commands, notes = meter_session(root, self.home, fetcher=None)
        text = status_text(agents, Path("/tmp/report.md"), "bun")
        self.assertIn("session-usage: shown via bun", text)
        self.assertIn("agents 2", text)
        self.assertIn("usd $", text)
        self.assertNotIn("## Tokens", text)
        self.assertNotIn("cargo test", text)
        self.assertLessEqual(len(text.splitlines()), 3)

    def test_cli_writes_status_not_tables(self) -> None:
        root = self.write_tree()
        cache = Path(self.temp.name) / "cache"
        stdout = io.StringIO()
        argv = [
            "--session-file",
            str(root),
            "--codex-home",
            str(self.home),
            "--no-openrouter",
            "--no-display",
        ]
        with (
            patch.dict(os.environ, {"XDG_CACHE_HOME": str(cache)}),
            patch("sys.stdout", stdout),
        ):
            main(argv)
        out = stdout.getvalue()
        self.assertIn("session-usage: shown via file", out)
        self.assertNotIn("## Tokens", out)
        report = cache / "session-usage" / "01root.md"
        self.assertTrue(report.is_file())
        self.assertIn("## Tokens", report.read_text())

    def test_cli_markdown_prints_tables(self) -> None:
        root = self.write_tree()
        stdout = io.StringIO()
        argv = [
            "--session-file",
            str(root),
            "--codex-home",
            str(self.home),
            "--no-openrouter",
            "--markdown",
        ]
        with patch("sys.stdout", stdout):
            main(argv)
        out = stdout.getvalue()
        self.assertIn("## Tokens", out)
        self.assertIn("cargo test", out)

    def test_display_with_bun(self) -> None:
        root = self.write_tree()
        agents, commands, notes = meter_session(root, self.home, fetcher=None)
        report = self.home / "report with spaces.md"
        markdown = render(agents, commands, notes)
        with tempfile.TemporaryFile(mode="w+", encoding="utf-8") as stream:
            with patch("sys.stdout", stream), patch.object(stream, "isatty", return_value=True):
                self.assertEqual(show_to_user(agents, commands, notes, markdown, report), "bun")
            stream.seek(0)
            shown = stream.read()
        self.assertEqual(report.read_text(), markdown)
        for text in ("Tokens", "API USD", "Commands", "/root/explorer", "cargo test", "1,500"):
            self.assertIn(text, shown)

    def test_bun_failure_preserves_report(self) -> None:
        root = self.write_tree()
        agents, commands, notes = meter_session(root, self.home, fetcher=None)
        report = self.home / "report.md"
        markdown = render(agents, commands, notes)
        for failure in (FileNotFoundError("bun"), None):
            with self.subTest(failure=failure), tempfile.TemporaryFile(mode="w+") as stream:
                with (
                    patch("sys.stdout", stream),
                    patch.object(stream, "isatty", return_value=True),
                    patch("subprocess.run", side_effect=failure) as run,
                    patch("sys.stderr", io.StringIO()),
                ):
                    run.return_value.returncode = 1
                    self.assertEqual(show_to_user(agents, commands, notes, markdown, report), "file")
                self.assertEqual(report.read_text(), markdown)


if __name__ == "__main__":
    unittest.main()

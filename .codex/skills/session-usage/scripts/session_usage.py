#!/usr/bin/python3
"""Meter Codex session tokens, command time, and estimated API USD."""

from __future__ import annotations

import argparse
import json
import os
import sys
import urllib.error
import urllib.parse
import urllib.request
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Callable, Iterable


OPENROUTER_MODELS_URL = "https://openrouter.ai/api/v1/models"
OPENROUTER_TIMEOUT_SEC = 8
COMMAND_TRUNCATE = 80
LONG_CONTEXT_TOKENS = 272_000

# USD per million tokens. Cache write defaults to 1.25x uncached input.
FALLBACK_USD_PER_MILLION: dict[str, dict[str, float]] = {
    "gpt-6-astra": {
        "prompt": 10.0,
        "completion": 50.0,
        "input_cache_read": 1.0,
        "input_cache_write": 12.5,
        "long_prompt": 20.0,
        "long_completion": 75.0,
        "long_input_cache_read": 2.0,
        "long_input_cache_write": 25.0,
    },
    "gpt-6-astra-pro": {
        "prompt": 10.0,
        "completion": 50.0,
        "input_cache_read": 1.0,
        "input_cache_write": 12.5,
        "long_prompt": 20.0,
        "long_completion": 75.0,
        "long_input_cache_read": 2.0,
        "long_input_cache_write": 25.0,
    },
    "gpt-5.4": {
        "prompt": 2.5,
        "completion": 15.0,
        "input_cache_read": 0.25,
        "input_cache_write": 3.125,
        "long_prompt": 5.0,
        "long_completion": 22.5,
        "long_input_cache_read": 0.5,
        "long_input_cache_write": 6.25,
    },
    "gpt-5.4-mini": {
        "prompt": 0.75,
        "completion": 4.5,
        "input_cache_read": 0.075,
        "input_cache_write": 0.9375,
    },
    "gpt-5.4-nano": {
        "prompt": 0.2,
        "completion": 1.25,
        "input_cache_read": 0.02,
        "input_cache_write": 0.25,
    },
    "gpt-5.5": {
        "prompt": 5.0,
        "completion": 30.0,
        "input_cache_read": 0.5,
        "input_cache_write": 6.25,
        "long_prompt": 10.0,
        "long_completion": 45.0,
        "long_input_cache_read": 1.0,
        "long_input_cache_write": 12.5,
    },
    "gpt-5.6-sol": {
        "prompt": 4.0,
        "completion": 20.0,
        "input_cache_read": 0.4,
        "input_cache_write": 5.0,
        "long_prompt": 8.0,
        "long_completion": 30.0,
        "long_input_cache_read": 0.8,
        "long_input_cache_write": 10.0,
    },
    "gpt-5.6-terra": {
        "prompt": 2.0,
        "completion": 12.0,
        "input_cache_read": 0.2,
        "input_cache_write": 2.5,
        "long_prompt": 4.0,
        "long_completion": 18.0,
        "long_input_cache_read": 0.4,
        "long_input_cache_write": 5.0,
    },
    "gpt-5.6-luna": {
        "prompt": 0.2,
        "completion": 1.2,
        "input_cache_read": 0.02,
        "input_cache_write": 0.25,
        "long_prompt": 0.4,
        "long_completion": 1.8,
        "long_input_cache_read": 0.04,
        "long_input_cache_write": 0.5,
    },
}

USAGE_KEYS = (
    "input_tokens",
    "cached_input_tokens",
    "cache_write_input_tokens",
    "output_tokens",
    "reasoning_output_tokens",
    "total_tokens",
)

CatalogFetcher = Callable[[str | None], list[dict[str, Any]]]


def fail(message: str) -> None:
    print(f"session-usage: {message}", file=sys.stderr)
    raise SystemExit(1)


def as_int(value: Any) -> int:
    if isinstance(value, bool) or value is None:
        return 0
    if isinstance(value, int):
        return value
    if isinstance(value, float):
        return int(value)
    try:
        return int(value)
    except (TypeError, ValueError):
        return 0


def as_float(value: Any) -> float:
    if isinstance(value, bool) or value is None:
        return 0.0
    if isinstance(value, (int, float)):
        return float(value)
    try:
        return float(value)
    except (TypeError, ValueError):
        return 0.0


def empty_usage() -> dict[str, int]:
    return {key: 0 for key in USAGE_KEYS}


def add_usage(target: dict[str, int], source: dict[str, Any] | None) -> dict[str, int]:
    blob = source or {}
    for key in USAGE_KEYS:
        target[key] += as_int(blob.get(key))
    return target


def copy_usage(source: dict[str, Any] | None) -> dict[str, int]:
    return add_usage(empty_usage(), source)


def uncached_input(usage: dict[str, int]) -> int:
    return max(usage["input_tokens"] - usage["cached_input_tokens"], 0)


def duration_seconds(value: Any) -> float:
    if value is None:
        return 0.0
    if isinstance(value, (int, float)) and not isinstance(value, bool):
        return float(value)
    if isinstance(value, dict):
        return as_float(value.get("secs")) + as_float(value.get("nanos")) / 1e9
    return 0.0


def format_duration(seconds: float) -> str:
    if seconds >= 60:
        minutes = int(seconds // 60)
        rest = seconds - minutes * 60
        return f"{minutes}m {rest:.1f}s"
    if seconds >= 1:
        return f"{seconds:.1f}s"
    if seconds >= 0.001:
        return f"{seconds * 1000:.1f}ms"
    return f"{seconds * 1e6:.1f}µs"


def format_tokens(value: int) -> str:
    return f"{value:,}"


def format_usd(value: float | None) -> str:
    if value is None:
        return "n/a"
    return f"${value:,.4f}"


def truncate_command(text: str, limit: int = COMMAND_TRUNCATE) -> str:
    compact = " ".join(text.split())
    if len(compact) <= limit:
        return compact
    if limit <= 1:
        return "…"
    return compact[: limit - 1] + "…"


def command_text(command: Any) -> str:
    if isinstance(command, str):
        return command
    if isinstance(command, list):
        parts = [str(part) for part in command]
        if (
            len(parts) >= 3
            and parts[0].endswith("bash")
            and parts[1] in ("-lc", "-c")
        ):
            return parts[2]
        return " ".join(parts)
    return str(command or "")


def markdown_cell(text: str) -> str:
    return text.replace("|", "\\|").replace("\n", " ")


def table(headers: list[str], rows: list[list[str]]) -> str:
    widths = [len(header) for header in headers]
    for row in rows:
        for index, cell in enumerate(row):
            widths[index] = max(widths[index], len(cell))
    def fmt(row: list[str]) -> str:
        return "| " + " | ".join(
            cell.ljust(widths[index]) for index, cell in enumerate(row)
        ) + " |"
    lines = [
        fmt(headers),
        "| " + " | ".join("-" * width for width in widths) + " |",
    ]
    lines.extend(fmt(row) for row in rows)
    return "\n".join(lines)


def load_session_meta(path: Path, *, strict: bool = True) -> dict[str, Any]:
    try:
        with path.open("r", encoding="utf-8") as stream:
            for line_number, line in enumerate(stream, 1):
                if not line.strip():
                    continue
                try:
                    event = json.loads(line)
                except json.JSONDecodeError as error:
                    if strict:
                        fail(f"{path}:{line_number}: invalid JSON: {error}")
                    return {}
                if event.get("type") != "session_meta":
                    continue
                payload = event.get("payload")
                return payload if isinstance(payload, dict) else {}
    except OSError as error:
        if strict:
            fail(f"cannot read session {path}: {error}")
        return {}
    return {}


def iter_rollouts(codex_home: Path) -> Iterable[Path]:
    for name in ("sessions", "archived_sessions"):
        root = codex_home / name
        if root.is_dir():
            yield from root.rglob("*.jsonl")


def find_session(thread_id: str, codex_home: Path) -> Path:
    matches = sorted(
        path
        for path in iter_rollouts(codex_home)
        if thread_id in path.name
    )
    if not matches:
        fail(f"no session found for thread-id {thread_id}")
    if len(matches) == 1:
        return matches[0]
    exact = [
        path
        for path in matches
        if path.name.endswith(f"-{thread_id}.jsonl")
    ]
    if len(exact) == 1:
        return exact[0]
    listed = "\n  ".join(str(path) for path in matches)
    fail(f"multiple sessions found for thread-id {thread_id}:\n  {listed}")
    raise AssertionError


def index_rollouts(codex_home: Path) -> dict[str, Path]:
    by_id: dict[str, Path] = {}
    for path in iter_rollouts(codex_home):
        meta = load_session_meta(path, strict=False)
        thread_id = meta.get("id") or meta.get("session_id")
        if isinstance(thread_id, str) and thread_id:
            by_id[thread_id] = path
    return by_id


def collect_tree(root_id: str, root_path: Path, by_id: dict[str, Path]) -> list[Path]:
    children: dict[str, list[Path]] = {}
    for thread_id, path in by_id.items():
        meta = load_session_meta(path, strict=False)
        parent = meta.get("parent_thread_id")
        if isinstance(parent, str) and parent:
            children.setdefault(parent, []).append(path)
    ordered: list[Path] = []
    seen: set[Path] = set()
    queue = [root_path]
    while queue:
        path = queue.pop(0)
        if path in seen:
            continue
        seen.add(path)
        ordered.append(path)
        meta = load_session_meta(path)
        thread_id = meta.get("id") or meta.get("session_id")
        if not isinstance(thread_id, str):
            continue
        for child in sorted(children.get(thread_id, []), key=str):
            queue.append(child)
    return ordered


@dataclass
class AgentMeter:
    thread_id: str
    label: str
    role: str
    nickname: str
    model: str
    method: str
    usage: dict[str, int] = field(default_factory=empty_usage)
    usd: float | None = None
    requests: list[dict[str, int]] = field(default_factory=list)


@dataclass
class CommandRow:
    seconds: float
    agent: str
    command: str


@dataclass
class Rates:
    prompt: float
    completion: float
    cache_read: float
    cache_write: float
    overrides: list[dict[str, Any]]
    source: str
    model_id: str


def agent_label(meta: dict[str, Any], is_root: bool) -> str:
    if is_root:
        return "main"
    path = meta.get("agent_path")
    if isinstance(path, str) and path:
        return path
    nickname = meta.get("agent_nickname")
    if isinstance(nickname, str) and nickname:
        return nickname
    return str(meta.get("id") or "agent")


def parse_events(path: Path) -> list[dict[str, Any]]:
    events: list[dict[str, Any]] = []
    try:
        with path.open("r", encoding="utf-8") as stream:
            for line_number, line in enumerate(stream, 1):
                if not line.strip():
                    continue
                try:
                    events.append(json.loads(line))
                except json.JSONDecodeError as error:
                    fail(f"{path}:{line_number}: invalid JSON: {error}")
    except OSError as error:
        fail(f"cannot read session {path}: {error}")
    return events


def latest_orchestrated_usage(events: list[dict[str, Any]]) -> dict[str, int] | None:
    latest: dict[str, int] | None = None
    for event in events:
        payload = event.get("payload")
        if not isinstance(payload, dict):
            continue
        blob = payload.get("orchestrated_role_token_usage")
        if blob is None and payload.get("type") == "token_count":
            info = payload.get("info")
            if isinstance(info, dict):
                blob = info.get("orchestrated_role_token_usage")
        if not isinstance(blob, list):
            continue
        summed = empty_usage()
        for row in blob:
            if not isinstance(row, dict):
                continue
            nested = row.get("usage")
            if isinstance(nested, dict):
                add_usage(summed, nested)
            else:
                add_usage(summed, row)
        latest = summed
    return latest


def meter_agent(path: Path, is_root: bool) -> tuple[AgentMeter, list[CommandRow]]:
    meta = load_session_meta(path)
    events = parse_events(path)
    model = "unknown"
    usage_records: list[dict[str, int]] = []
    commands: list[CommandRow] = []
    label = agent_label(meta, is_root)
    thread_id = str(meta.get("id") or "")
    role = str(meta.get("agent_role") or ("main" if is_root else ""))
    nickname = str(meta.get("agent_nickname") or ("main" if is_root else ""))

    for event in events:
        payload = event.get("payload") if isinstance(event.get("payload"), dict) else {}
        event_type = event.get("type")
        if event_type == "turn_context" and isinstance(payload.get("model"), str):
            model = payload["model"]
        elif event_type == "world_state":
            state = payload.get("state")
            if isinstance(state, dict) and isinstance(state.get("model"), str):
                model = state["model"]
        elif event_type == "token_usage_record":
            usage = payload.get("usage")
            if isinstance(usage, dict):
                usage_records.append(copy_usage(usage))
        elif event_type == "event_msg" and payload.get("type") == "item_completed":
            item = payload.get("item")
            if isinstance(item, dict) and item.get("type") == "CommandExecution":
                commands.append(
                    CommandRow(
                        seconds=duration_seconds(item.get("duration")),
                        agent=label,
                        command=truncate_command(command_text(item.get("command"))),
                    )
                )

    if usage_records:
        usage = empty_usage()
        for record in usage_records:
            add_usage(usage, record)
        method = "token_usage_record"
        requests = usage_records
    else:
        orchestrated = latest_orchestrated_usage(events)
        if orchestrated is not None:
            usage = orchestrated
            method = "orchestrated_role_token_usage"
        else:
            usage = empty_usage()
            for event in reversed(events):
                payload = event.get("payload") if isinstance(event.get("payload"), dict) else {}
                if event.get("type") == "event_msg" and payload.get("type") == "token_count":
                    info = payload.get("info")
                    if isinstance(info, dict) and isinstance(info.get("total_token_usage"), dict):
                        usage = copy_usage(info.get("total_token_usage"))
                        break
            method = "token_count.total_token_usage"
        requests = [copy_usage(usage)] if any(usage.values()) else []

    meter = AgentMeter(
        thread_id=thread_id,
        label=label,
        role=role,
        nickname=nickname,
        model=model,
        method=method,
        usage=usage,
        requests=requests,
    )
    return meter, commands


def per_token(usd_per_million: float) -> float:
    return usd_per_million / 1_000_000


def fallback_rates(model: str) -> Rates | None:
    row = FALLBACK_USD_PER_MILLION.get(model)
    if row is None:
        return None
    overrides: list[dict[str, Any]] = []
    if "long_prompt" in row:
        overrides.append(
            {
                "min_prompt_tokens": LONG_CONTEXT_TOKENS,
                "prompt": per_token(row["long_prompt"]),
                "completion": per_token(row["long_completion"]),
                "input_cache_read": per_token(row["long_input_cache_read"]),
                "input_cache_write": per_token(row["long_input_cache_write"]),
            }
        )
    return Rates(
        prompt=per_token(row["prompt"]),
        completion=per_token(row["completion"]),
        cache_read=per_token(row["input_cache_read"]),
        cache_write=per_token(row["input_cache_write"]),
        overrides=overrides,
        source=f"fallback:{model}",
        model_id=model,
    )


def parse_openrouter_price(value: Any) -> float:
    return as_float(value)


def rates_from_openrouter(item: dict[str, Any]) -> Rates:
    pricing = item.get("pricing") if isinstance(item.get("pricing"), dict) else {}
    prompt = parse_openrouter_price(pricing.get("prompt"))
    completion = parse_openrouter_price(pricing.get("completion"))
    cache_read = parse_openrouter_price(pricing.get("input_cache_read"))
    cache_write = parse_openrouter_price(pricing.get("input_cache_write"))
    if cache_read <= 0 and prompt > 0:
        cache_read = prompt * 0.1
    if cache_write <= 0 and prompt > 0:
        cache_write = prompt * 1.25
    overrides: list[dict[str, Any]] = []
    raw_overrides = pricing.get("overrides")
    if isinstance(raw_overrides, list):
        for raw in raw_overrides:
            if not isinstance(raw, dict):
                continue
            override = {
                "min_prompt_tokens": as_int(raw.get("min_prompt_tokens")),
            }
            for key in ("prompt", "completion", "input_cache_read", "input_cache_write"):
                if key in raw:
                    override[key] = parse_openrouter_price(raw.get(key))
            overrides.append(override)
    return Rates(
        prompt=prompt,
        completion=completion,
        cache_read=cache_read,
        cache_write=cache_write,
        overrides=overrides,
        source=f"openrouter:{item.get('id')}",
        model_id=str(item.get("id") or ""),
    )


def model_slug(model: str) -> str:
    return model.strip().lower().split("/")[-1]


def match_openrouter_model(model: str, catalog: list[dict[str, Any]]) -> dict[str, Any] | None:
    slug = model_slug(model)
    if not slug:
        return None
    matches: list[dict[str, Any]] = []
    for item in catalog:
        item_id = str(item.get("id") or "").lower()
        if not item_id or ":batch" in item_id:
            continue
        tail = item_id.split("/")[-1]
        if item_id == slug or tail == slug:
            matches.append(item)
    if not matches:
        return None
    exact = [
        item
        for item in matches
        if str(item.get("id") or "").lower() in {slug, f"openai/{slug}"}
    ]
    pool = exact or matches
    pool.sort(key=lambda item: len(str(item.get("id") or "")))
    return pool[0]


def default_openrouter_fetch(query: str | None) -> list[dict[str, Any]]:
    url = OPENROUTER_MODELS_URL
    if query:
        url = f"{url}?{urllib.parse.urlencode({'q': query})}"
    request = urllib.request.Request(
        url,
        headers={"Accept": "application/json", "User-Agent": "session-usage"},
    )
    with urllib.request.urlopen(request, timeout=OPENROUTER_TIMEOUT_SEC) as response:
        payload = json.loads(response.read().decode("utf-8"))
    data = payload.get("data") if isinstance(payload, dict) else None
    return data if isinstance(data, list) else []


def resolve_rates(
    model: str,
    fetcher: CatalogFetcher | None,
    cache: dict[str, Rates | None],
) -> Rates | None:
    if model in cache:
        return cache[model]
    rates: Rates | None = None
    if fetcher is not None:
        try:
            catalog = fetcher(model)
            match = match_openrouter_model(model, catalog)
            if match is None:
                catalog = fetcher(None)
                match = match_openrouter_model(model, catalog)
            if match is not None:
                rates = rates_from_openrouter(match)
        except (urllib.error.URLError, urllib.error.HTTPError, TimeoutError, json.JSONDecodeError, OSError):
            rates = None
    if rates is None:
        rates = fallback_rates(model)
    cache[model] = rates
    return rates


def select_tier(rates: Rates, input_tokens: int) -> tuple[float, float, float, float]:
    prompt, completion, cache_read, cache_write = (
        rates.prompt,
        rates.completion,
        rates.cache_read,
        rates.cache_write,
    )
    for override in rates.overrides:
        threshold = as_int(override.get("min_prompt_tokens"))
        if threshold and input_tokens >= threshold:
            prompt = as_float(override.get("prompt", prompt))
            completion = as_float(override.get("completion", completion))
            cache_read = as_float(override.get("input_cache_read", cache_read))
            cache_write = as_float(override.get("input_cache_write", cache_write))
    return prompt, completion, cache_read, cache_write


def cost_for_request(usage: dict[str, int], rates: Rates) -> float:
    prompt, completion, cache_read, cache_write = select_tier(rates, usage["input_tokens"])
    cached = usage["cached_input_tokens"]
    uncached = uncached_input(usage)
    write = usage["cache_write_input_tokens"]
    output = usage["output_tokens"]
    return (
        uncached * prompt
        + cached * cache_read
        + write * cache_write
        + output * completion
    )


def cost_for_agent(meter: AgentMeter, rates: Rates | None) -> float | None:
    if rates is None:
        return None
    requests = meter.requests or ([meter.usage] if any(meter.usage.values()) else [])
    return sum(cost_for_request(request, rates) for request in requests)


def meter_session(
    root_path: Path,
    codex_home: Path,
    fetcher: CatalogFetcher | None = default_openrouter_fetch,
) -> tuple[list[AgentMeter], list[CommandRow], list[str]]:
    root_meta = load_session_meta(root_path)
    root_id = str(root_meta.get("id") or root_meta.get("session_id") or "")
    if not root_id:
        fail(f"session has no id: {root_path}")
    by_id = index_rollouts(codex_home)
    by_id[root_id] = root_path
    notes: list[str] = []
    agents: list[AgentMeter] = []
    commands: list[CommandRow] = []
    rate_cache: dict[str, Rates | None] = {}
    for index, path in enumerate(collect_tree(root_id, root_path, by_id)):
        meter, agent_commands = meter_agent(path, is_root=(index == 0))
        rates = resolve_rates(meter.model, fetcher, rate_cache)
        meter.usd = cost_for_agent(meter, rates)
        if rates is None:
            notes.append(f"no API price for model {meter.model} on {meter.label}")
        elif rates.source.startswith("fallback:"):
            notes.append(f"{meter.model} priced from {rates.source}")
        else:
            notes.append(f"{meter.model} priced from {rates.source}")
        agents.append(meter)
        commands.extend(agent_commands)
    commands.sort(key=lambda row: (-row.seconds, row.agent, row.command))
    unique_notes = list(dict.fromkeys(notes))
    return agents, commands, unique_notes


def sum_usage(agents: list[AgentMeter]) -> dict[str, int]:
    total = empty_usage()
    for agent in agents:
        add_usage(total, agent.usage)
    return total


def total_usd(agents: list[AgentMeter]) -> float | None:
    total = 0.0
    for agent in agents:
        if agent.usd is None:
            return None
        total += agent.usd
    return total


def token_table(agents: list[AgentMeter]) -> tuple[list[str], list[list[str]]]:
    headers = [
        "Agent",
        "Role",
        "Model",
        "Input",
        "Cached in",
        "Uncached in",
        "Cache write",
        "Output",
        "Reasoning",
    ]
    rows: list[list[str]] = []
    for agent in agents:
        rows.append(
            [
                markdown_cell(agent.label),
                markdown_cell(agent.role or "—"),
                markdown_cell(agent.model),
                format_tokens(agent.usage["input_tokens"]),
                format_tokens(agent.usage["cached_input_tokens"]),
                format_tokens(uncached_input(agent.usage)),
                format_tokens(agent.usage["cache_write_input_tokens"]),
                format_tokens(agent.usage["output_tokens"]),
                format_tokens(agent.usage["reasoning_output_tokens"]),
            ]
        )
    usage = sum_usage(agents)
    rows.append(
        [
            "total",
            "—",
            "—",
            format_tokens(usage["input_tokens"]),
            format_tokens(usage["cached_input_tokens"]),
            format_tokens(uncached_input(usage)),
            format_tokens(usage["cache_write_input_tokens"]),
            format_tokens(usage["output_tokens"]),
            format_tokens(usage["reasoning_output_tokens"]),
        ]
    )
    return headers, rows


def usd_table(agents: list[AgentMeter]) -> tuple[list[str], list[list[str]]]:
    headers = ["Agent", "Role", "Model", "USD"]
    rows = [
        [
            markdown_cell(agent.label),
            markdown_cell(agent.role or "—"),
            markdown_cell(agent.model),
            format_usd(agent.usd),
        ]
        for agent in agents
    ]
    rows.append(["total", "—", "—", format_usd(total_usd(agents))])
    return headers, rows


def command_table(commands: list[CommandRow]) -> tuple[list[str], list[list[str]]]:
    headers = ["Time", "Agent", "Command"]
    rows = [
        [
            format_duration(row.seconds),
            markdown_cell(row.agent),
            markdown_cell(row.command),
        ]
        for row in commands
    ] or [["—", "—", "none"]]
    return headers, rows


def captions(agents: list[AgentMeter], notes: list[str]) -> list[str]:
    methods = ", ".join(dict.fromkeys(agent.method for agent in agents))
    lines = [
        f"Usage method: {methods}.",
        "Input includes cached input. Output includes reasoning. Reasoning is not billed twice.",
        "USD is list API pricing, not a ChatGPT/Codex subscription rate.",
    ]
    if notes:
        lines.append("Pricing: " + "; ".join(notes) + ".")
    return lines


def render(agents: list[AgentMeter], commands: list[CommandRow], notes: list[str]) -> str:
    token_headers, token_rows = token_table(agents)
    usd_headers, usd_rows = usd_table(agents)
    command_headers, command_rows = command_table(commands)
    blocks = [
        "## Tokens",
        table(token_headers, token_rows),
        "",
        "## API USD",
        table(usd_headers, usd_rows),
        "",
        "## Commands",
        table(command_headers, command_rows),
        "",
        *captions(agents, notes),
    ]
    return "\n".join(blocks) + "\n"


def report_file(thread_id: str) -> Path:
    root = Path(os.environ.get("XDG_CACHE_HOME", str(Path.home() / ".cache")))
    directory = root / "session-usage"
    directory.mkdir(parents=True, exist_ok=True)
    safe = "".join(ch if ch.isalnum() or ch in "-_" else "-" for ch in thread_id)
    return directory / f"{safe}.md"


def status_text(
    agents: list[AgentMeter],
    report: Path,
    renderer: str,
) -> str:
    usage = sum_usage(agents)
    session = agents[0].thread_id if agents else "unknown"
    return (
        f"session-usage: shown via {renderer}\n"
        f"session {session}  agents {len(agents)}  "
        f"input {format_tokens(usage['input_tokens'])}  "
        f"output {format_tokens(usage['output_tokens'])}  "
        f"usd {format_usd(total_usd(agents))}\n"
        f"report: {report}\n"
    )


def _add_rich_table(
    console: Any,
    title: str,
    headers: list[str],
    rows: list[list[str]],
    numeric: set[int],
) -> None:
    from rich import box
    from rich.table import Table

    grid = Table(
        title=title,
        box=box.SIMPLE_HEAVY,
        header_style="bold cyan",
        show_lines=False,
        pad_edge=False,
        expand=True,
    )
    last = len(headers) - 1
    for index, header in enumerate(headers):
        grid.add_column(
            header,
            justify="right" if index in numeric else "left",
            overflow="fold" if index == last else "ellipsis",
            no_wrap=index != last,
        )
    for row in rows:
        style = "bold" if row and row[0] == "total" else None
        grid.add_row(*row, style=style)
    console.print(grid)


def display_with_rich(
    agents: list[AgentMeter],
    commands: list[CommandRow],
    notes: list[str],
    stream: Any,
) -> bool:
    try:
        from rich.console import Console
    except ImportError:
        return False
    console = Console(file=stream, force_terminal=True, color_system="auto")
    token_headers, token_rows = token_table(agents)
    usd_headers, usd_rows = usd_table(agents)
    command_headers, command_rows = command_table(commands)
    console.rule("[bold]Session usage")
    _add_rich_table(console, "Tokens", token_headers, token_rows, {3, 4, 5, 6, 7, 8})
    _add_rich_table(console, "API USD", usd_headers, usd_rows, {3})
    _add_rich_table(console, "Commands", command_headers, command_rows, {0})
    for line in captions(agents, notes):
        console.print(line, style="dim")
    return True


def display_with_cli(report: Path, stream: Any) -> str | None:
    import shutil
    import subprocess

    commands = []
    rich_cli = shutil.which("rich")
    if rich_cli:
        commands.append((rich_cli, ["--markdown", "--force-terminal", str(report)]))
    glow = shutil.which("glow")
    if glow:
        commands.append((glow, [str(report)]))
    for binary, args in commands:
        try:
            result = subprocess.run(
                [binary, *args],
                stdout=stream,
                stderr=subprocess.DEVNULL,
                check=False,
            )
        except OSError:
            continue
        if result.returncode == 0:
            return Path(binary).name
    return None


def show_to_user(
    agents: list[AgentMeter],
    commands: list[CommandRow],
    notes: list[str],
    markdown: str,
    report: Path,
) -> str:
    report.write_text(markdown, encoding="utf-8")
    tty = None
    if sys.stdout.isatty():
        stream: Any = sys.stdout
    else:
        try:
            tty = open("/dev/tty", "w", encoding="utf-8", errors="replace")
        except OSError:
            return "file"
        stream = tty
    try:
        if display_with_rich(agents, commands, notes, stream):
            return "rich"
        cli = display_with_cli(report, stream)
        if cli:
            return cli
    finally:
        if tty is not None:
            tty.close()
    return "file"


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Meter Codex session tokens, command time, and estimated API USD."
    )
    parser.add_argument("--thread-id", help="session or agent thread id")
    parser.add_argument("--session-file", type=Path, help="read this rollout as the root")
    parser.add_argument(
        "--codex-home",
        type=Path,
        default=None,
        help="Codex home containing sessions/ (default: $CODEX_HOME or ~/.codex)",
    )
    parser.add_argument(
        "--no-openrouter",
        action="store_true",
        help="skip OpenRouter and use the hardcoded price table",
    )
    parser.add_argument(
        "--markdown",
        action="store_true",
        help="print markdown tables to stdout instead of rendering",
    )
    parser.add_argument(
        "--no-display",
        action="store_true",
        help="write the report file and status only; skip the terminal renderer",
    )
    return parser.parse_args(argv)


def resolve_root(args: argparse.Namespace) -> tuple[Path, Path]:
    if args.codex_home is not None:
        codex_home = args.codex_home.expanduser()
    else:
        codex_home = Path(os.environ.get("CODEX_HOME", str(Path.home() / ".codex"))).expanduser()
    if args.session_file is not None:
        return args.session_file.expanduser(), codex_home
    thread_id = args.thread_id or os.environ.get("CODEX_THREAD_ID")
    if not thread_id:
        fail("CODEX_THREAD_ID is not set; pass --thread-id or --session-file")
    return find_session(thread_id, codex_home), codex_home


def main(argv: list[str] | None = None) -> None:
    args = parse_args(argv)
    root_path, codex_home = resolve_root(args)
    fetcher: CatalogFetcher | None
    fetcher = None if args.no_openrouter else default_openrouter_fetch
    agents, commands, notes = meter_session(root_path, codex_home, fetcher)
    markdown = render(agents, commands, notes)
    if args.markdown:
        sys.stdout.write(markdown)
        return
    thread_id = agents[0].thread_id if agents else "session"
    report = report_file(thread_id)
    if args.no_display:
        report.write_text(markdown, encoding="utf-8")
        renderer = "file"
    else:
        renderer = show_to_user(agents, commands, notes, markdown, report)
    sys.stdout.write(status_text(agents, report, renderer))


if __name__ == "__main__":
    main()

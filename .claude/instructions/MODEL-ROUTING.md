# Claude Code model and reasoning routing

Role definitions fix no model or effort. For each non-fork spawn, select both for the current
subtask's unresolved difficulty. Default: Opus, medium. These are starting points, adjusted by
observed results:

| Task | Model | Effort |
|---|---|---|
| Exact lookup, extraction, formatting, straightforward rewriting | sonnet | low |
| Scoped fix with a known cause and clear verification | sonnet | medium |
| Visual interpretation, defined UI workflow, writing with several constraints | sonnet | medium |
| Routine implementation, debugging, tests, review, repository investigation | opus | medium |
| Difficult implementation, debugging, architecture, or ambiguous root causes | opus | high |
| Sustained correctness analysis or unresolved interacting invariants | opus | xhigh |
| Hardest unresolved reasoning where added time and cost are justified | opus | max |
| Web UI design, implementation, or restyling | opus | high |

Role starting points, adjusted for the assignment's difficulty:

| Role | Model | Effort |
|---|---|---|
| explorer | sonnet | high |
| investigator | opus | medium |
| review-correctness, review-simplify, ui-reviewer | opus | high |

Retrieve missing evidence and resolve tool or environment failures before escalating. Raise effort
when the approach is sound but reasoning or verification is insufficient; switch from Sonnet to
Opus when framing or judgment is failing. Skip intermediate levels when warranted. After resolving
the difficult decision, route remaining work by its own difficulty and preserve decisive evidence,
constraints, and unresolved questions across handoffs.

Pass `model` and `effort` only where the active tool schema and model support them. A native fork
inherits its parent's model and effort. If per-invocation effort is unavailable, leave effort
inherited rather than pinning role files or changing session settings. Report a host override that
prevents the chosen budget from taking effect.

Claude Code documents native invocation fields and precedence under
[model selection](https://code.claude.com/docs/en/sub-agents#choose-a-model) and
[effort selection](https://code.claude.com/docs/en/sub-agents#choose-an-effort-level).

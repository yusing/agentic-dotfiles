# Model and reasoning routing

Native roles fix no model or effort, so set both on every spawn. Default: gpt-6-astra, low.

Select for the current subtask's unresolved difficulty. Treat the following
as starting points; use observed results to adjust.

| Task | Model | Effort |
|---|---|---|
| Exact lookup, extraction, formatting, straightforward rewriting | gpt-6.1-terra | low |
| Scoped code fix with a known cause and clear verification | gpt-6.1-terra | medium |
| Visual interpretation, defined UI workflow, writing with several constraints | gpt-6.1-terra | medium |
| Routine implementation, debugging, tests, repository investigation | gpt-6.1-sol | high |
| Routine review | gpt-6.1-sol | medium |
| Difficult implementation or debugging within an understood design | gpt-6-astra | medium |
| Sustained correctness analysis with known requirements | gpt-6-astra | high |
| Demanding review with known requirements | gpt-6.1-sol | xhigh |
| Architecture, ambiguous root causes, novel algorithms, conflicting constraints | gpt-6-astra | high |
| Exceptionally difficult reasoning or unresolved interacting invariants | gpt-6-astra | xhigh |
| Hardest unresolved reasoning where added time and cost are justified | gpt-6-astra | max |
| Web UI design, implementation, or restyling, when Claude delegates are available | Claude Opus | high |

Role starting points, adjusted by the table above for the assignment's difficulty:

| Role | Model | Effort |
|---|---|---|
| explorer | gpt-6.1-terra | xhigh |
| investigator | gpt-6.1-sol | high |
| review-correctness, review-simplify | gpt-6.1-sol | high |
| ui-reviewer | gpt-6-astra | high |

Adjustment rules:
- Retrieve missing evidence and resolve tool/environment failures before escalating.
- Raise effort when the approach is sound but reasoning or verification is insufficient.
- Switch to Astra when framing, judgment, or understanding of interacting systems is failing.
- Skip intermediate levels when the task already warrants a stronger configuration.
- After resolving the difficult decision, route remaining work by its own difficulty.
- Preserve decisive evidence, constraints, and unresolved questions across handoffs.
- Use only model and effort values supported by the current host.

Ultra:
Use only when supported and meaningful independent subtasks justify parallel agents.
Choose the coordinating model using the same routing criteria above.
Do not select Ultra solely because a single reasoning problem is difficult.

Terra none:
Use only when the endpoint supports it and a direct transformation needs no
substantial reasoning. Otherwise use low.

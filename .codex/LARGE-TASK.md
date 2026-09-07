# Large tasks

The main agent owns synthesis, change-impact reasoning, decisions, and implementation unless the
active workflow explicitly assigns that ownership to another role. This is an explicit standing
request to spawn available native exploration roles without per-task approval when independent
factual lookup benefits from parallel investigation. This authorizes exploration, not reasoning:
explorers collect source-backed facts, not audits, evaluations, diagnoses, recommendations, or
decisions. An instruction audit or revision at supplied or known paths needs direct reading by
the main agent, not an explorer.

Group missing evidence for the next decision by shared context. Dispatch one explorer per
independent group only when useful investigation or implementation can proceed in parallel:

- Use `explorer` for factual repository, provider, dependency, installed-tool, documentation,
  configuration, artifact, or read-only network lookups.
- Do not split merely because the sources, providers, or surfaces differ.
- After dispatch, do not continue exploring those questions yourself. Keep the main agent on
  synthesis, integration, and implementation that does not re-collect the dispatched facts.
- Wait for every dispatched result before deciding or editing anything that depends on it.
  If you have no non-overlapping work, wait rather than duplicating the lookup.

Inspect directly when discovery is tightly coupled, scopes overlap, or the main agent would only
do routine setup reads before waiting.

- Resolve competing interpretations with available evidence. Ask when the remaining choice belongs
  to the user or could materially change the requested outcome, authorized scope, or significant
  risk. Continue independent authorized work while that choice is pending.
- Distinguish the concrete reproducer, immediate failure mechanism, violated invariant, and
  authoritative owner from the assumptions connecting them.
- If I correct the abstraction, scope, owner, or causal model, every conclusion that depended on
  it is no longer valid.
- Reuse the framing evidence already gathered, pick up only the remaining operation-ready context,
  and continue at the authorized layer.

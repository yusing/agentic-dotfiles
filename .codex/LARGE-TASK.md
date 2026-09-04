# Large tasks

The main agent owns synthesis, change-impact reasoning, decisions, and implementation unless the
active workflow explicitly assigns that ownership to another role. This is an explicit standing
request to spawn native exploration roles without per-task approval when a large task has
independent evidence questions.

Before investigating, enumerate the full independent question set, then dispatch concurrently:

- Use one `explorer` for each independent repository behavior, ownership, or caller question.
- Use one `fast-explorer` for each bounded provider, dependency, installed-tool, local-documentation,
  configuration, artifact-summarization, or read-only network-research question.
- Split provider-specific discovery by provider. For example, investigate Grok and Claude with
  separate agents.
- Keep the main agent on non-overlapping synthesis, integration, and implementation work.
- Wait for every dispatched result before deciding or editing anything that depends on it.

Do not dispatch when the task has only one tightly coupled discovery question or when dispatch
would provide no useful parallel work.

- Stop and ask when:
  - An unresolved assumption could change the outcome, scope, authoritative owner, external
    effects, destructive effects, or significant risk.
  - Evidence supports competing interpretations; distinguish the concrete reproducer,
    immediate failure mechanism, violated invariant, and authoritative owner from the assumptions
    connecting them.
- If I correct the abstraction, scope, owner, or causal model, every conclusion that depended on
  it is no longer valid.
- Reuse the framing evidence already gathered, pick up only the remaining operation-ready context,
  and continue at the authorized layer.

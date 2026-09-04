# Large tasks

The main agent owns diagnosis, change-impact reasoning, and decisions. When it lacks repository
evidence needed to continue, give each `explorer` exactly one atomic evidence question, such as
locating an owning path or identifier, tracing current behavior from code, or identifying affected
callers. Spawn multiple explorers concurrently only for independent questions.

- For artifact summarization or context-heavy reading, use `fast-explorer`.
- For repository investigation, use `explorer`.

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

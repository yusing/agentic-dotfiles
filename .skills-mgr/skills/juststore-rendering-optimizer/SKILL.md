---
name: juststore-rendering-optimizer
description: Design, review, or optimize juststore subscription, derived-state, and update boundaries in React.
---

# Juststore Rendering Optimizer

Start from the affected state owner and required render/update behavior, using an observed problem
when one exists rather than requiring it. Trace the relevant reactive reads and imperative effects,
then choose the smallest subscription and component boundary that meets the requirement.

## Rendering contracts

- Keep subscription registration and store writes outside render. Imperative subscriptions need
  an effect or external lifecycle owner and complete cleanup.
- Preserve hidden-child state versus unmount/remount behavior, derived read/write/reset mappings,
  omission semantics, and persisted versus transient state.
- Narrow reads and writes to the consumer's actual needs. A whole-collection adapter is valid
  when its child API genuinely reads and replaces the complete collection.

## Reference

Read [juststore-rendering-patterns.md](references/juststore-rendering-patterns.md) when choosing
subscription APIs, conditional components, derived adapters, collection boundaries, atoms, or
high-frequency update handling. It owns API-specific decision guidance and examples.

## Completion

Verify the affected render behavior, subscription cleanup, and state round trips. Use debounce or
local state only when the source's frequency and accepted latency justify it; do not add buffering
merely because input or websocket code is present. Finish when the chosen boundaries satisfy the
required behavior and preserve its contracts. Support optimization claims with measured improvement;
identify unmeasured claims without requiring a pre-existing defect for design or review work.

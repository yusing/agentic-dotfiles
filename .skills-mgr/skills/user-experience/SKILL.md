---
name: user-experience
description: Handle lifecycle, progress, output, and failure behavior in user-facing changes.
---

# User Experience

- Scope UX work proportionally to the behavior and risk that actually change. For localized deterministic display, message, or formatting changes, inspect only the owner and affected state.
- When a user-facing lifecycle changes, trace only the affected invocation, validation, waiting, success, failure, cancellation, and retry states. Reuse established progress, diagnostics, output, and interaction conventions.
- For an affected long-running, data-dependent, or network-bound operation, reuse progress or add it when useful and honest. Show immediate feedback, meaningful phases, and counts or percentages when totals are known.
- Keep machine-readable stdout clean by sending progress to stderr unless the interface explicitly says otherwise. Make redirected progress newline-delimited; keep interactive progress transient and clear it before results or errors.
- Propagate cancellation and rendering failures, preserving existing error contracts. Keep secrets out of progress, diagnostics, and output.
- Finish after checking affected cases among interactive, redirected, empty-work, failure, cancellation, retry, and unknown-progress behavior; report any remaining UX limitations.

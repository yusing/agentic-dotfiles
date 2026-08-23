---
name: user-experience
description: Apply proportional user-experience and operability guidance when changing user-facing commands, workflows, APIs, or interfaces, especially their affected lifecycle states, progress reporting, output behavior, and failure handling.
---

# User Experience

- Scope UX work proportionally to the behavior and risk that actually change. For localized deterministic display, message, or formatting changes, inspect only the owner and affected state.
- When a user-facing lifecycle changes, trace only the affected invocation, validation, waiting, success, failure, cancellation, and retry states. Reuse established progress, diagnostics, output, and interaction conventions.
- Design progress for long-running, data-dependent, or network-bound work unless it is predictably short or honest progress is impossible. Emit immediate feedback, meaningful phases, and counts or percentages when totals are known.
- Keep machine-readable stdout clean by sending progress to stderr unless the interface explicitly says otherwise. Make redirected output newline-delimited; keep interactive progress transient and clear it before results or errors.
- Propagate cancellation and rendering failures. Never expose secrets in progress, diagnostics, or rendered output.
- Validate only affected interactive, redirected, empty-work, failure, cancellation, retry, and unknown-progress cases.

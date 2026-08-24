# Codex hook architecture

This is the repository map for dynamic hook ownership. It identifies owners without
copying the policies they own.

## Hook surfaces

- `.codex/hooks.json` is registration only: lifecycle event, matcher, command, timeout,
  and status message. A script is active only when registered there; an implementation
  file existing under `.codex/hooks/` is not by itself an active hook.
- The registered implementation under `.codex/hooks/` owns its detection, state,
  decision, and injected wording. Hooks read event JSON from stdin and may deny an
  operation, add event-scoped context, or update session state.
- Hook coverage is limited to its registered events, matchers, supported command shapes,
  and lifecycle exemptions. Do not remove a whole-task invariant from `.codex/AGENTS.md`
  merely because a narrower hook touches the same subject.
- Conversely, do not keep an equivalent always-on copy of an event-scoped hook policy in
  the base prompt or `.codex/AGENTS.md`. The hook is the source of truth for the matched
  workflow; static guidance may contain only the broader invariant that remains necessary
  outside the hook's coverage.
- When static guidance and a hook would prescribe different behavior, fix the ownership
  boundary instead of relying on load order or apparent specificity. Harness mechanics
  belong in the base prompt, whole-task constraints in `.codex/AGENTS.md`, and event-
  conditional detection or enforcement in the hook.
- Inspect paired pre/post hooks together only when behavior crosses invocation and result
  handling. Otherwise change the single owning hook and its focused test. When moving a
  policy from static guidance into a hook, update coverage to assert both its presence in
  the hook and its absence from the static surfaces.

# Testing

Validate layout and visual appearance through rendered output; validate text content at its
consuming interface.

A useful test fails when its intended behavior breaks. Avoid tautologies, incidental string checks,
and synthetic inputs that bypass the changed producer or consumer.

Derive checks from requested outcomes and existing consumer contracts, not implementation branches.
Cover equivalent supported input forms and interacting states at changed boundaries; isolated
cases do not establish their combined behavior. For mutations, check invalid-input, stale-state,
and ownership cases. Rejection must preserve prior state; success must work through the normal
consumer. Pair new input restrictions with checks that neighboring supported inputs still work.

- Keep test-only helpers and seams in tests, out of production code.
- Do not introduce surfaces the user did not request merely to support tests.
- When tests slow delivery, reduce their cost without weakening distinct coverage.
- Repair a stale test or fixture that blocks required validation, and report the repair.

A change is test-heavy when its tests add more than 50 net lines and more than its production code,
unless tests are the requested outcome. Use that weight to assess brittle implementation or
redundant cases, not to presume either exists. Simplify evidenced complexity and remove or merge
redundant cases; retain tests needed for distinct requested behavior regardless of the ratio.

## When to run

Run checks against coherent changes, ordered by their cost and the work their results can invalidate:

- Before the change, run tests only when a reported failure needs reproducing to find its cause.
- Finish production, tests, and affected behavioral contracts for a coherent working path, then
  run new tests and affected existing consumer checks together. Use compilation or type checks
  earlier when they are much cheaper.
- Run needed broader checks when the integrated change is ready and failure could invalidate the
  next review or handoff. Overlap non-mutating checks with read-only review of the same snapshot;
  defer expensive checks until their covered code is stable, not all checks until the end.
- After a failure, rerun the failing tests. Rerun a passing check only when code it covers
  changed after it passed.

## Regression evidence

A defect fix covers the reported failure and the retained contracts the fix affects, not every state
the surrounding code handles.

Establish a regression test's fault sensitivity by inspection: it drives the defect's trigger
through the changed path and asserts the corrected outcome. Run it against old code only when
inspection cannot show that, such as timing- or environment-dependent reach, or when the user asks.
Use the project's existing old-code check and leave the live worktree and index untouched; when the
project has none, report the inspection argument instead of building a mechanism. One failure on
the intended assertion settles it; setup, compilation, timeout, or unrelated failures prove nothing.
Later edits that keep the trigger and assertion do not reopen it.

New APIs, new behavior, and behavior-preserving refactors need consuming acceptance, not a failure
on old production code.

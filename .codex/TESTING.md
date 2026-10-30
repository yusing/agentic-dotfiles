# Testing

Validate layout and visual appearance through rendered output; validate text content at its
consuming interface.

A useful test fails when its intended behavior breaks. Avoid tautologies, incidental string checks,
and synthetic inputs that bypass the changed producer/consumer.

Derive checks from requested outcomes and existing consumer contracts, not implementation branches.
Cover equivalent supported input forms and interacting states at changed boundaries; isolated
cases do not establish their combined behavior. For mutations, check invalid-input, stale-state,
and ownership cases. Rejection must preserve prior state; success must work through the normal
consumer. Pair new input restrictions with checks that neighboring supported inputs still work.

- Keep test-only helpers/seams in tests, not production.
- Give fixture subprocesses test-owned configuration. Git fixtures disable inherited global/system
  configuration before their first command, retaining fixture-local settings for behavior under test.
- Do not introduce surfaces the user did not request merely to support tests.
- When tests slow delivery, reduce their cost without weakening distinct coverage.
- Repair a stale test or fixture that blocks required validation, and report the repair.

Measure explicit size, latency, and resource targets through the consuming path; report actual
values and any unmeasured target. Test-heavy changes (more than 50 net test lines and more than
production code, unless tests are the requested outcome) prompt necessity assessment during
implementation. Simplify redundant or brittle tests while retaining distinct required coverage.

## When to run

Run checks against coherent changes, ordered by the work their results can invalidate:

- Before a change, reproduce a reported failure only when needed to find its cause.
- Phase 1: implement the consuming path and its focused acceptance or regression checks together.
  Include the defect trigger and corrected assertion, and boundary checks whose failure could
  invalidate the approach or reveal broken retained behavior. Run affected existing consumer checks
  with them. Use cheaper compilation or type checks earlier when useful.
- Phase 2: complete additional distinct supported-form/state coverage and broader regression checks
  once the covered code is stable. Run checks that could invalidate a review or handoff before it;
  overlap independent read-only review and checks of the same snapshot.
- After a failure, rerun the failing checks. Repeat passing checks only when their covered code
  changes; reuse still-current results through delivery.

## Regression evidence

A defect fix covers the reported failure and the retained contracts the fix affects, not a matrix
of every state the surrounding code handles.

Establish a regression test's fault sensitivity by inspection: it drives the defect's trigger
through the changed path and asserts the corrected outcome. Run it against old code only when
inspection cannot show that, such as timing- or environment-dependent reach, or when the user asks.
Use the project's existing old-code check, leaving the live worktree/index untouched; without one,
report the inspection argument rather than build a mechanism. One failure on the intended assertion
settles it; setup, compilation, timeout, or unrelated failures prove nothing. Later edits that keep
the trigger and assertion do not reopen it.

New APIs, new behavior, and behavior-preserving refactors need consuming acceptance, not old-code
failure.

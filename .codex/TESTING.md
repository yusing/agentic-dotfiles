# Testing

Validate layout and visual appearance through rendered output; validate text content at its
consuming interface.

A useful test fails when its intended behavior breaks. Avoid tautologies, incidental string checks,
and synthetic inputs that bypass the changed producer/consumer.

- Keep test-only helpers/seams in tests, not production.
- Do not introduce surfaces the user did not request merely to support tests.
- When tests slow delivery, reduce their cost without weakening distinct coverage.

A change is test-heavy when tests add more than 50 net lines and more than its production code,
unless tests are the requested outcome. Use that weight to assess brittle implementation or
redundant cases, not to presume either exists. Simplify evidenced complexity and remove or merge
redundant cases; retain tests needed for distinct requested behavior regardless of the ratio.

## When to run

Test waits dominate task time, so run checks against a finished change, not around each edit:

- Run nothing before the change unless a reported failure needs reproducing to find its cause.
- Finish the production, test, and document edits for a coherent change, then run its focused
  checks once. Use compilation or type checks earlier only when they are much cheaper.
- After a failure, rerun the failing tests. Rerun a passing check only when code it covers
  changed after it passed.
- Run broader consumer or full-suite checks once, last, and only when the change reaches them.

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

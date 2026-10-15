# Testing

Validate layout and visual appearance through rendered output; validate text content at its
consuming interface.

A useful test fails when its intended behavior breaks. Avoid tautologies, incidental string checks,
and synthetic inputs that bypass the changed producer or consumer.

- Keep test-only helpers and seams in tests, out of production code.
- Do not introduce surfaces the user did not request merely to support tests.
- Skip a baseline check when it adds no value to the work.
- When tests slow delivery, reduce their cost without weakening distinct coverage.

A change is test-heavy when its tests add more than 50 net lines and more than its production code,
unless tests are the requested outcome. Use that weight to assess brittle implementation or
redundant cases, not to presume either exists. Simplify evidenced complexity and remove or merge
redundant cases; retain tests needed for distinct requested behavior regardless of the ratio.

## Regression evidence

A defect fix covers the reported failure and the retained contracts the fix affects, not every state
the surrounding code handles.

For a reproduced defect with a compatible old interface, use the project's isolated baseline-overlay
check when one exists. Record the baseline, selected test, fixture or environment, successful
builds, the intended old failure, and the current pass. Setup, compilation, timeout, or unrelated
failures prove nothing. Leave the live worktree and index untouched.

New APIs and behavior-preserving refactors need consuming acceptance or fault sensitivity, not a
forced failure on old production code. Reuse verified results for unchanged state.

# Testing

Validate the requested behavior and affected retained contracts at their consuming interfaces. Cover
each input kind, state, and caller path the requested behavior must handle, not only the motivating
case. Derive cases from requested and retained requirements and from reproduced failures, not from
each guard, bound, or race path the implementation adds. Choose realistic inputs and relevant
boundaries. Each case protects a distinct observable requirement or defect; extra values,
permutations, or fixtures alone do not justify a test matrix. Reuse existing fixtures and assertions
before creating another harness.

A useful test fails when its intended behavior breaks. Avoid tautologies, incidental string checks,
synthetic inputs that bypass the changed producer or consumer, and UI appearance assertions already
covered by rendered snapshots. Keep test-only helpers and seams in tests, out of production code.
Preserve separate state, interaction, color, wire, privacy, and transformation contracts when the
change affects them.

A change is test-heavy when its tests add more than 50 net lines and more than its production code,
unless tests are the requested outcome. Before review, trace that weight either to brittle
implementation that needs many cases, which you simplify, or to cases these rules exclude, which you
remove or merge.

Run focused checks after a coherent implementation, not on known-broken intermediate edits. Broaden
only for effects that cross owner boundaries. Reduce test cost without weakening distinct coverage.

## Regression evidence

A defect fix covers the reported failure and the retained contracts the fix affects, not every state
the surrounding code handles.

For a reproduced defect with a compatible old interface, use the project's isolated baseline-overlay
check when one exists. Record the baseline, selected test, fixture or environment, successful
builds, the intended old failure, and the current pass. Setup, compilation, timeout, or unrelated
failures prove nothing. Leave the live worktree and index untouched.

New APIs and behavior-preserving refactors need consuming acceptance or fault sensitivity, not a
forced failure on old production code. Reuse verified results for unchanged state.

# Testing

Validate the requested behavior and affected retained contracts at their consuming interfaces.
Cover each input kind, state, and caller path the requested behavior must handle, not only the
motivating case. Derive cases from requested and retained requirements and reproduced failures, not
from each guard, bound, or race path the implementation adds. Choose realistic inputs and relevant
boundaries. Each case must protect a distinct observable requirement or defect; additional values,
permutations, or fixtures alone do not justify a test matrix. Reuse existing fixtures and
assertions before creating another harness.

A useful test fails when its intended behavior breaks. Avoid tautologies, incidental string checks,
synthetic inputs that bypass the changed producer/consumer, and duplicate UI appearance assertions
already covered by rendered snapshots. Keep test-only helpers/seams in tests, not production.
Preserve separate state, interaction, color, wire, privacy, and transformation contracts when affected.
A change is test-heavy when tests add more than 50 net lines and more than its production code,
unless tests are the requested outcome. Before review, trace that weight to brittle implementation
needing many cases, which you simplify, or to cases these rules exclude, which you remove or merge.

Run focused checks after a coherent implementation, not known-broken intermediate edits. Broaden
only for effects across owner boundaries. Optimize test cost without weakening distinct coverage.

## Regression evidence

A defect fix covers the reported failure and the retained contracts the fix affects, not a matrix
of every state the surrounding code handles.

For a reproduced defect with a compatible old interface, use the project's isolated baseline-overlay
check when available. Record baseline, selected test, fixture/environment, successful builds,
intended old failure, and current pass. Setup, compilation, timeout, or unrelated failures prove
nothing. Leave the live worktree/index untouched.

New APIs and behavior-preserving refactors need consuming acceptance or fault sensitivity, not
forced failure on old production. Reuse verified results for the unchanged state.

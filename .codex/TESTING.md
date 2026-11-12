# Testing

Derive assertions from ledger outcomes; existing tests and fixtures show the current means. Before
changing shared behavior, select assertions for its other sourced consumers and author missing ones
in existing tests. Use them to guide the coherent owner/interface change, then validate it with
new-behavior checks before dependent work. Batch coupled behavior, not gates per function or
command. New behavior needs no ceremonial failing run; run unchanged behavior first only to resolve
an uncertain expected outcome.

## Coverage

Drive the changed producer through its normal consumer. Reuse existing coverage and fixtures;
add distinct checks for affected supported forms and interacting states, including equivalent
representations at changed parsing/routing boundaries. Interfaces that must agree share fixture
state; assertions follow ledger lines rather than configuration adjusted to fit implementation.

For mutations, cover invalid input, stale state, ownership, and neighboring supported inputs:
rejection preserves state and success works through the consumer. A defect fix covers its trigger
and affected contracts, not every surrounding state. Avoid tautologies, copied-message assertions,
and synthetic inputs bypassing the changed path.

Keep test helpers and configuration in tests. Git fixtures disable inherited global/system settings
before their first command, retaining fixture-local settings under test. Add no production surface
just for tests. Cite the ledger line behind each new or changed expected value, snapshot, or golden
in the task record or handoff, not in test code; change an existing one only for a ledger line that
changed it.

Validate visual appearance through rendering and text delivery through its consuming interface.
Only added/moved delivery paths need new text checks, referencing their owner; rewording alone does
not. Measure explicit size, latency, and resource targets through the consumer and report actual
values and unmeasured targets.

## Execution and evidence

Choose the least costly checks supplying distinct required coverage, including the project's
regression suite. A runner wrapper and its equivalent underlying command supply the same coverage;
do not run both unless explicitly required or they exercise different behavior or environments.
Use source inspection for invariants it establishes and bounded execution for uncertain reach or
behavior. Resolve compilation failures before expensive checks. Use race, stress, or specialized
checks when changed behavior or the project contract warrants them.

While known corrections or a pending review can still change covered code, run focused affected
checks; defer the broader regression suite until that work is settled. After failure, rerun failed
checks and passing checks whose behavior changed; unchanged results remain evidence through delivery.
Reduce redundant or brittle tests without weakening distinct coverage.

Establish regression sensitivity by inspecting the trigger, changed path, and assertion. Run against
old code only when inspection cannot establish reach, such as timing/environment-dependent defects,
or when requested. Use an existing old-code check without changing the live worktree/index; absent
one, report the inspection argument rather than build a mechanism. One intended-assertion failure
settles it; setup, compilation, timeout, or unrelated failures do not. Edits retaining that trigger
and assertion do not reopen the evidence. New behavior and preserving refactors need acceptance,
not old-code failure.

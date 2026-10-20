# Test commits

A `test` commit adds or changes tests or test infrastructure without changing production
behavior. Name the behavior under test in the subject, not the test mechanics.

Body paragraphs, in order:

1. Importance, cause first: `Because <gap>, <failure that went unnoticed>`, naming the bug the
   tests guard against (with the fix commit's SHA or issue) or the contract they pin.
2. Coverage, action first: the imperative verb of the addition, which behavior the tests
   exercise, and at what level, such as unit, integration, or end to end.
3. Proof, when it adds confidence: open with `Verified by` and show the tests fail against a
   known-bad version, such as the commit before the fix they guard.

Situations:

- Flaky test: name the source of nondeterminism, how the test now avoids it, and the evidence,
  such as 500 consecutive passes under a race detector. A race in production code is a `fix`.
- Snapshot or golden update: say which output changed and which commit made the new output
  intended.
- Test infrastructure: say what tests can now do that they could not before.

<example>
test(scheduler): cover jobs that span a daylight-saving change

Because no test covered local-time schedules crossing a DST
transition, the duplicate 02:30 runs fixed in 7c41e2a
("fix(scheduler): run local-time jobs once across DST") went
unnoticed.

Add table tests for spring-forward and fall-back days in three zones,
checking the run count and timestamps.

Verified by running them on the parent of 7c41e2a, where they fail,
and on main, where they pass.
</example>

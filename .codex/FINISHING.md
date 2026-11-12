# Finishing

Main or an explicitly assigned coordinator uses this document for question-specific independent
review. Construction, validation, and documentation remain with their existing owners; completion
does not require loading this document or reassessing established results.

## Review decisions

Arrange review for a concrete unanswered correctness/integration or complexity question. Decide
these questions separately using current evidence. A completed change, size threshold, or risk
category alone does not require review. Explicit user-requested reviews retain their scope.

Dispatch after focused validation and decisions that could change the design. Brief the reviewer
with the request sources and corrections, the ledger, the diff, and the unresolved question, not the
implementer's approach. Native roles own review methods; `TESTING.md` owns validation evidence.
Keep sources stable, overlap independent non-mutating work, and wait when none remains.

## Findings

Correct established in-scope findings at their owners. Prefer narrowing/removing flawed supporting
mechanisms; obtain a decision if that changes requested behavior. A correction's affected consumer
checks close the finding unless the design changes or it reaches uninspected code; then request
only the needed re-review with prior evidence and dispositions. Route review to the correction
owner, arranging it through the parent when necessary.

Reuse unchanged evidence. After a second correction round still finds new issues, or when the user
asks for speed, stop requesting further review, complete authorized fixes, and report the limits.

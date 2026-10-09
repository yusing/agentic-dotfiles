---
name: council
description: Deliberate on an important decision that remains unsettled after evidence gathering.
disable-model-invocation: false
---

# Council

Use for an important question that still has multiple evidence-supported answers after ordinary
investigation. State the target, output, evidence boundary, assumptions, exclusions, and authority.
Ordinary inspection follows REVIEW.md.

## Composition

Use the smallest useful council: 2 members for two supported approaches, 3 for interacting concerns,
4 only for exceptional difficulty that benefits from additional viewpoints. With fewer slots,
batch members without exposing peers' first passes.

Every council keeps at least one member within the target's implementation-evidence boundary.
Investigators replace blind seats and occupy at most half the seats; evidence does not add seats.
Keep `brief.md` implementation-neutral. Investigators gather implementation evidence themselves.

Verify blindness from assembled client context, including inherited instructions/hooks. No-history
alone is not isolation. If exposed implementation cannot be suppressed through a verified neutral
path, report strict blindness unavailable and return the target to main for an authorized alternative;
asking a member to ignore received evidence does not restore independence.

## Member configuration

Select native council roles with unique names and self-contained, no-history briefs
(Codex: `fork_turns: "none"`). Omit `model`; the role/client owns it. Omit `reasoning_effort`
by default. An allowed override may use `high` for complex questions or `xhigh`/`max` for exceptional
ones supported by the model; fixed role settings remain authoritative.

## Artifacts and phases

Create a task-scoped root with `mktemp -d` outside the repository. Write the target/evidence manifest
to `brief.md`; prepare absolute result paths as needed:

```text
answers/member-N.md
reviews/member-N.md
replies/member-N.md
final.md
```

Repository files stay read-only. Each member writes only its assigned result. Every handoff names
`phase`, `brief_artifact`, `input_artifacts`, and `result_artifact`.

1. **Answer:** spawn all members with the brief and separate answer artifacts. No member seeks
   peer artifacts; relay no investigator finding during first passes. Wait for all answers.
2. **Review:** choose one existing member as finalizer by target fit. Give it every answer and
   a review artifact. Its comparison identifies material disputes/gaps and whether replies are
   needed. Wait for its review.
3. **Reply, only if needed:** give non-finalizers the answers and review, with separate reply
   artifacts. Wait for their responses to unresolved points.
4. **Final:** give the finalizer the brief and every answer/review/reply, assigning `final.md`.
   Require one user-ready answer, not concatenated outputs or votes, preserving uncertainty/dissent.

Use at most two follow-ups per member. Main relays phase artifacts without reading or reproducing
member deliberations; read only `final.md` for the substantive response. Add no competing synthesis,
only an operational limit the finalizer could not represent. Report blocked coverage instead of
inventing consensus. Remove the owned temporary root after consumption and delivery.

---
name: council
description: Deliberate on an important decision that remains unsettled after evidence gathering.
disable-model-invocation: false
---

# Council

Use `council-member` agents to deliberate on one target without polluting the main thread or
letting later opinions bias the independent first pass.

## Establish the target

State the question, requested output, authoritative evidence, assumptions, exclusions, and the
authorization layer. Keep every member at that layer. Deliberation does not authorize repository
edits, external writes, process control, or any other operation the user did not request.

Choose the smallest useful council:

- Use 1 member for a bounded target that needs an independent check or careful self-critique.
- Use 2 members for a moderate target with two plausible interpretations or approaches.
- Use 3 members for a complex target spanning several interacting concerns.
- Use 4 members only for an exceptionally difficult, ambiguous, cross-domain, or high-stakes
  target that benefits from maximum viewpoint diversity.

Do not inflate the council. If fewer concurrency slots are available, run members in batches while
preserving first-pass independence.

## Choose the composition

Fill the seats chosen above with two roles. Evidence never buys an extra seat.

- `council-member` deliberates implementation-blind, so its proposal cannot be anchored to what
  already exists.
- `council-investigator` gathers repository, history, and external-contract evidence itself, so the
  council's answer is tested against current behavior, feasibility, and cost.

Every council keeps at least one blind member, and a one-member council is always blind. Seat an
investigator only when the target turns on facts the brief cannot state neutrally, such as
feasibility, migration cost, an existing dependency, or a disputed claim about current behavior.
Fill at most half the seats with investigators: an investigator replaces a blind seat rather than
adding one.

Keep `brief.md` implementation-neutral for every member. The investigator gathers implementation
evidence itself, so a blind member's first pass never sees it.

## Configure members

Spawn every member with its chosen `agent_type`, a unique task name, `fork_turns: "none"`, and a
self-contained handoff. Omit `model` on every spawn; model selection belongs to the selected role
and client.

Omit `reasoning_effort` by default to use the role's configured effort or the client's inherited
default. When the client permits an effort override and the discussion target needs more reasoning,
use `high` for complex targets and `xhigh` or `max` for exceptionally difficult targets when the
selected model supports it. A fixed role setting remains authoritative.

## Create the artifact handoff

Create one task-scoped root with `mktemp -d`, then create these paths beneath it as needed:

```text
brief.md
answers/member-N.md
reviews/member-N.md
replies/member-N.md
final.md
```

Write the complete target and evidence manifest to `brief.md`. Give every member absolute artifact
paths. Keep repository files read-only; each member may write only its assigned result artifact.

## Run the deliberation

1. Spawn all members for the `answer` phase. Give each the brief and a unique answer artifact. Tell
   each member not to read or seek another member's artifacts. An investigator gathers its own
   evidence here, so relay no finding of its to any member. Wait for every answer.
2. Send one follow-up to every member for the `review` phase. Give each all answer artifacts and a
   unique review artifact. Require comparison of claims, evidence, assumptions, omissions, and
   disagreements. Blind members read every answer from this phase onward, including the evidence an
   investigator gathered. With one member, require a falsification-oriented self-review instead.
   Wait for every review.
3. Choose one existing member as finalizer based on fit for the target and first-pass quality.
   Either role may finalize. For
   councils with multiple members, send a second follow-up to every non-finalizer for the `reply`
   phase. Give them all answers and reviews, require them to answer the critiques and revise their
   positions in unique reply artifacts, then wait for every reply.
4. Send the finalizer its second follow-up for the `final` phase. Give it the brief plus every
   answer, review, and reply artifact, and assign `final.md`. Require one user-ready response that
   resolves disagreements where the evidence permits, preserves material uncertainty or dissent,
   and does not merely concatenate member outputs.

Each handoff must name `phase`, `brief_artifact`, `input_artifacts`, and `result_artifact`. Do not
reuse a member for more than these two follow-ups.

## Return the result

Read `final.md` and use it as the substantive response to the main thread. Do not add a competing
parent synthesis. Add only an operational limitation that the finalizer could not represent, if
one exists.

Remove the temporary artifact root after its contents have been consumed and the response has been
delivered. If a required member is blocked, report the missing coverage instead of inventing a
consensus.

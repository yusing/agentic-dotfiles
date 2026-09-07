---
name: council
description: Deliberate on an important decision that remains unsettled after evidence gathering.
disable-model-invocation: false
---

# Council

Use `council-member` agents when an important decision retains multiple evidence-supported
conclusions that available evidence and authoritative owners cannot settle. Preserve independent
first passes; ordinary inspection follows the standing review policy.

## Establish the target

State the question, requested output, authoritative evidence, assumptions, exclusions, and the
authorization layer. Keep every member at that layer. Deliberation does not authorize repository
edits, external writes, process control, or any other operation the user did not request.

Choose the smallest useful council:

- Use 2 members for two evidence-supported interpretations or approaches.
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

Every council keeps at least one blind member. Seat an
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
2. Choose one existing member as finalizer based on fit for the target. Either role may finalize.
   Give it all answers for the `review` phase and a unique review artifact. Require comparison of
   claims and evidence, identifying material disagreements or gaps that need a peer response.
   Its routing status indicates whether replies are needed. Wait for that review.
3. Only when replies are needed, give the non-finalizers all answers and the review for the `reply`
   phase. Require responses to the unresolved points in unique reply artifacts, then wait for them.
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

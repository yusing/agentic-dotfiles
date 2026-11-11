---
name: council
description: Independent multi-agent review and deliberation. Use when the user requests council, or an important decision remains unsettled after investigation.
disable-model-invocation: false
---

# Council

Use when explicitly requested, or when an important decision remains unsettled after investigation.
An explicit request does not require established alternatives; members may discover objections and
alternatives during assessment. State the target, output, evidence boundary, assumptions, exclusions,
and authority. Ordinary inspection follows the delivery and review guidance in FINISHING.md.

## Composition

User-specified members and their configurations take precedence over council defaults.

Use the smallest useful council: 2 members by default, 3 for interacting concerns,
4 only for exceptional difficulty that benefits from additional viewpoints. With fewer slots,
batch members without exposing peers' first passes.

Match evidence access to the target. Design exploration may begin from an implementation-neutral
brief. Reviewing existing work requires the actual scoped implementation and relevant contracts.
Use investigators for evidence gathering; they occupy at most half the seats. Evidence access does
not add seats.

Require strict blindness only when the assessment needs it. In those cases, verify assembled client
context, including inherited instructions/hooks; no-history alone is not isolation. If the required
boundary cannot be maintained, report the limitation and seek an authorized alternative. Otherwise,
shared source evidence is compatible with independent judgments; keep first passes peer-independent.

## Member configuration

Select native council roles with unique names and self-contained, no-history briefs
(Codex: `fork_turns: "none"`). Resolve model and effort through the client's model-routing
document. Within its permitted choices, discover and select the latest available flagships
through the active host, preferring `high` effort where supported.
Use members from multiple providers when the harness exposes them, such as Claude delegates in
Mekugi; diversify the existing seats rather than adding seats solely for provider coverage.

On a fatal model/provider failure, such as an exhausted weekly usage limit, stop retrying that
endpoint and replace the affected member with an available flagship, preferring another provider.
Keep the selected effort where supported, the assigned role, and the current phase's evidence
and isolation boundaries.
Report the fallback and any lost provider coverage. If replacement would violate user-specified
membership or configuration, request approval instead; continue independent authorized work.

## Artifacts and phases

Create a task-scoped root with `mktemp -d` outside the repository. Write the target/evidence manifest
to `brief.md`; prepare absolute result paths as needed:

```text
answers/member-N.md
reviews/round-R/member-N.md
replies/round-R/member-N.md
final.md
```

Repository files stay read-only. Each member writes only its assigned result. Every handoff names
`phase`, `brief_artifact`, `input_artifacts`, and `result_artifact`.

1. **Answer:** spawn all members with the brief and separate answer artifacts. No member seeks
   peer artifacts; relay no investigator finding during first passes. Wait for all answers.
2. **Review:** choose one existing member as finalizer by target fit. Give it every answer and
   a review artifact. Its comparison identifies material disputes/gaps and the points requiring
   confirmation or reply. Wait for its review.
3. **Resolve:** give non-finalizers the answers and current review, with separate reply artifacts.
   Ask each to confirm satisfaction with how its concerns are resolved or represented, or name
   the remaining concerns. Wait for their replies.
   Give the finalizer the preceding review and latest replies for another review. It confirms
   its own satisfaction and returns only a routing status and the new review artifact path.
   `ready` requires every member's explicit satisfaction with the current dispositions.
   Return `needs-replies` while targeted replies can resolve material concerns, or `stalled`
   when further exchanges make no substantive progress. Repeat only on `needs-replies`.
   Satisfaction permits acknowledged dissent. On `stalled`, Final must report incomplete
   agreement and preserve the unresolved concerns.
4. **Final:** give the finalizer the brief and every answer/review/reply, assigning `final.md`.
   Require one user-ready answer, not concatenated outputs or votes, preserving uncertainty/dissent.

Main relays phase artifacts without reading or reproducing
member deliberations; read only `final.md` for the substantive response. Add no competing synthesis,
only an operational limit the finalizer could not represent. Report blocked coverage instead of
inventing consensus. Remove the owned temporary root after consumption and delivery.

These phases assess the target; they do not authorize implementation changes or a repeated
fix-and-review loop.

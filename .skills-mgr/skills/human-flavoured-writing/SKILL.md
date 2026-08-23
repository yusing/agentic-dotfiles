---
name: human-flavoured-writing
description: >
  Write posts, READMEs blurbs, launch notes, and product threads in a human-flavoured
  voice: cold-reader first, show-before-explain, one honest claim, light non-native grit,
  no AI smell. Use when drafting or rewriting Reddit/HN/Discord posts, launch copy,
  casual project announcements, or when the user asks for human tone, anti-AI prose,
  non-native English flavour, or runs /human-flavoured-writing.
disable-model-invocation: true
---

# Human-flavoured writing

Write so a *cold reader* (zero prior context, skimming a feed) gets the point, trusts
the claim, and knows what to do next. Predictable process every run; voice details live
in the rules below and in [`references/style-rules.md`](references/style-rules.md).

**Done when:** the draft passes the cold-read checklist at the end, and the user can
paste it without a second rewrite pass for tone.

## Process

### 1. Name the cold reader

State in one line: venue (e.g. r/codex), what they already know, what they do not.
Completion: that line is written before any drafting.

### 2. Show first

Pick the smallest concrete demo that sells the idea (side-by-side code, one before/after,
one number with units). Draft that block before the pitch prose.
Completion: a stranger can see the win from the demo alone.

### 3. Build the spine

Use this order unless the user asks otherwise:

1. Sharp title with the concrete win (number or outcome), not a vibe word.
2. Pain in 1-2 short sentences.
3. What you built in plain words (no architecture tour).
4. The demo (*show first*).
5. Optional second example only if it teaches a different move.
6. *One claim*: the headline metric in one breath with what it is / is not.
7. *Try path*: minimal install or run steps before deep reliability lore.
8. Reliability / method / edge cases (short).
9. Honest limits (what the comparison does not cover).
10. Soft CTA (invite failures and real workloads, not "star please").

Cut a section if it only impresses people who already care.
Completion: spine order matches above; no deep dive appears before try path.

### 4. Apply the voice

Follow [`references/style-rules.md`](references/style-rules.md). Defaults:

- First person when it is your work ("I made", "I count").
- Short paragraphs. One idea per paragraph is fine; two is max.
- Fragments and ellipsis ok when they sound spoken.
- Light *non-native grit*: small article/agreement slips, slightly off word choice.
  Keep meaning clear. Do not parody broken English.
- Prefer concrete nouns and verbs over abstract framing.
- Tables only when numbers need scanning; one reduction column, no duplicate identical rows
  that exist only to look rigorous.

Completion: every paragraph re-read aloud could be typed by a tired engineer at night.

### 5. Scrub AI smell

Rewrite until none of these remain (positive target: sounds like a person posted it):

- Em-dashes (the long dash character). Use period, comma, colon, or parentheses.
- Balanced "It's not X. It's Y." essay cadence stacked in a row.
- "Here's the thing", "Let's dive in", "In this post I'll", "Without further ado".
- Perfect parallel bullet sermons; corporate "leverage / unlock / seamless / robust".
- Over-bold; bold only for the claim or section labels the eye needs.
- Fake twin metrics rows, or a 47% title then three paragraphs of apology with no
  single clean sentence that states the scoped truth.

When hedging, one clean sentence beats a methodology essay. Put harsh counting rules
in one short paragraph after the table, not before the demo.
Completion: a pass finds zero em-dashes and zero items from the AI-smell list in
[`references/style-rules.md`](references/style-rules.md).

### 6. Cold-read pass

Read as the person from step 1. Answer:

1. Do I know what this is after the first demo?
2. Do I trust the number without re-reading twice?
3. Can I try it tonight from this post alone (or a clear README pointer)?
4. Does the middle feel like a pitch or a design diary?
5. Would I upvote and forget, or actually open the link?

Fix whatever fails. Prefer delete over soft rewrite.
Completion: all five answers are satisfactory, or failures are listed to the user.

## Worked shape

Canonical example of this voice: the hpatch r/codex post in the repo that owns the
topic, or [`references/example-spine.md`](references/example-spine.md) for the spine
without full product detail.

## Out of scope

- Formal papers, legal text, or brand guidelines that require perfect grammar.
- Code comments and commit messages (use project norms).
- Turning every document into non-native English; grit is for public casual prose
  when the user wants this skill.

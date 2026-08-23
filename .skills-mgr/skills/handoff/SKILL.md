---
name: handoff
description: Create a compact, actionable, and redacted handoff document for a fresh agent.
argument-hint: "What will the next session be used for?"
disable-model-invocation: true
---

Write a concise Markdown handoff document so a fresh agent can resume the work. Save it as
`HANDOFF.md` in the current workspace. Writing it replaces any earlier handoff at that path, and
the earlier one stays unread.

Read the handoff standard with `skills-mgr get handoff/STANDARD.md`, then write `HANDOFF.md`.
Those are the only two actions this skill takes: compose the document from the context you already
hold, and hand off immediately.

After writing it, output only the path of the handoff file written. If any other instruction
constrain the path output format (e.g. Markdown link), follow it.
DO NOT REPEAT THE CONTENT OR INCLUDE ANYTHING ELSE IN THE RESPONSE.

## Cutoff

Everything before this handoff skill invocation. Do not include the handoff itself in the handoff markdown.

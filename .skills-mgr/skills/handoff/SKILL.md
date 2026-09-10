---
name: handoff
description: Create a compact, actionable, and redacted handoff document for a fresh agent. Also read `handoff/STANDARD.md`.
disable-model-invocation: true
---

Write a concise Markdown handoff document so a fresh agent can resume the work. Save it as
`HANDOFF.md` in the current workspace. Writing it replaces any earlier handoff at that path, and
the earlier one stays unread.

Compose the document from the context you already hold, and hand off immediately.

The standard owns the document content. This skill owns the cutoff, file destination, and final
path-only response.

After writing it, output only the path of the handoff file written. If any other instruction
constrain the path output format (e.g. Markdown link), follow it.
DO NOT REPEAT THE CONTENT OR INCLUDE ANYTHING ELSE IN THE RESPONSE.

## Cutoff

Everything before this handoff skill invocation. Do not include the handoff itself in the handoff markdown.

This file handoff remains undelivered until `HANDOFF.md` is written. If runtime compaction begins
first, it supersedes this invocation and inherits this cutoff. After compaction, resume the task
from this cutoff; writing `HANDOFF.md` and returning its path are no longer due.

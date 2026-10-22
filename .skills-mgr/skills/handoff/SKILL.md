---
name: handoff
description: Create an actionable and redacted handoff document for a fresh agent. Also read `handoff/STANDARD.md`.
disable-model-invocation: true
---

Write a Markdown handoff document for the user's requested continuation, not the
whole conversation backlog.
Save it as `HANDOFF.md` in that task's workspace or worktree, using the location already
established in context rather than the shell's cwd or a parent checkout. An explicit
user destination takes precedence. Writing it replaces any earlier handoff at that path, and
the earlier one stays unread.

After the required reads, write the document as the next action from the context already
held. Do not interleave planning commentary, task investigation or progress reporting.

The standard owns the document content. This skill owns the cutoff, file destination, and final
path-only response.

After writing it, respond with only the path of the handoff file, not its content. If another
instruction constrains the path's format (for example, a Markdown link), follow it.

## Cutoff

Everything before this handoff skill invocation. Do not include the handoff itself in the handoff markdown.

This file handoff remains undelivered until `HANDOFF.md` is written. If runtime compaction begins
first, it supersedes this invocation and inherits this cutoff. After compaction, resume the task
from this cutoff; writing `HANDOFF.md` and returning its path are no longer due.

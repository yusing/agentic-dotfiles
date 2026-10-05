---
name: commit
description: Plan, write, or revise git commits, including folding follow-up fixes into earlier commits.
disable-model-invocation: false
---

# Commit

A documented project convention (contributing guide, commitlint or similar config) takes
precedence over the message format below. This skill does not authorize committing, rewriting
history, or pushing; those follow the existing request and authorization.

## Shape commits

- Make each commit one coherent, independently valid change. Reuse checks for its unchanged
  tree/scope, not unrelated suites. Split unrelated edits; keep an enabling refactor separate
  from its behavior change.
- Stage explicitly (`git add <paths>` or `git add -p`), then review `git diff --staged` before
  committing. Leave unrelated working-tree changes unstaged.
- Commit with the configured signing. A signing failure or timeout usually means the user must
  unlock the key: report it as a blocker and retry after they respond. Commit unsigned or change
  signing configuration only when the user authorizes it.
- When squashing several commits into one, as in a squash merge, derive the message from
  theirs. Keep their reasons and consequences, and drop steps that the combined change no
  longer shows.

## Message format

```
<type>(<scope>): <subject>

<body>

<trailers>
```

- `type`: `feat`, `fix`, `perf`, `refactor`, `docs`, `test`, `build`, `ci`, `chore`, or `revert`.
- `scope`: optional; the affected component, package, or area, in lower case.
- `subject`: imperative mood, lower-case start, no trailing period, at most 72 characters
  including the prefix. State what the change does, not how it was made.
- `body`: omit it when the subject is enough. Add one when the subject cannot carry the reason
  or the full scope, such as a commit that combines several user-visible fixes. Explain why the
  change is needed and any non-obvious consequence or trade-off; do not narrate the diff. Wrap
  at 72 columns.
- Breaking change: add `!` after the type or scope and a `BREAKING CHANGE: <description>`
  trailer describing the migration.
- Trailers: `Fixes #123`, `Refs #123`, `Co-authored-by:`, and any attribution the client or
  project requires, each on its own line after a blank line.

Pass a multi-line message as real lines through a quoted heredoc, `git commit -F - <<'EOF'`.
Git and the shell keep a `\n` escape inside `-m` quotes as a literal backslash and `n`, including
when a tool-call string supplies the command. Check the stored message with
`git log -1 --format=%B`.

## Follow-up fixes

A correction to an unpublished commit goes into that commit, not into a new standalone commit
such as `fix typo` or `address review`. A commit is unpublished when no remote-tracking branch
contains it (`git branch -r --contains <sha>` prints nothing) and no one else builds on it, even
when it sits on the local default branch. Replacing the target's approach, including at the
user's request, is a correction to it.

1. Find the commit that introduced the code being corrected: `git log --oneline <base>..HEAD`,
   `git blame`, or `git log -L <range>:<file>`.
2. Stage only the hunks for that target. When a follow-up touches several earlier commits,
   make one fixup per target.
3. Create the marker commit:
   - `git commit --fixup=<sha>` (`fixup!`): content change; keeps the target's message.
   - `git commit --fixup=amend:<sha>` (`amend!`): content change that also makes the target's
     message inaccurate; supply the full replacement message.
   - `git commit --fixup=reword:<sha>` (`amend!`, no content): message-only correction.
   - When the target is `HEAD`, `git commit --amend` is equivalent and needs no later squash.

   `amend:` and `reword:` open an editor and reject `-m`/`-F`. Without an interactive editor,
   write the marker directly with the heredoc form above: the first paragraph is
   `amend! <exact target subject>` (e.g. `amend! feat: add parser`), and the remaining
   paragraphs are the replacement message (e.g. `feat(parser): add streaming parser` and its
   body). Add `--allow-empty` for a message-only correction.
4. Squash the markers only when the user asks or the workflow requires a clean branch:
   `git rebase --autosquash <base>` (Git 2.44+), or
   `GIT_SEQUENCE_EDITOR=: git rebase -i --autosquash <base>` on older Git. Squashing rewrites
   history; force-pushing the result needs `--force-with-lease` and authorization to rewrite
   the remote branch.

Make a regular commit (usually `fix`) instead when the target is published, or when the change
is a distinct change worth its own history entry rather than a revision of the target.

---
name: commit
description: Plan, write, revise, or push git commits, including folding follow-up fixes into earlier commits.
disable-model-invocation: false
---

# Commit

A documented project convention (contributing guide, commitlint or similar config) takes
precedence over the message format below. This skill does not authorize committing, rewriting
history, or pushing; those follow the existing request and authorization. A commit or push request
covers the work of that request, not later ones.

## Shape commits

- Make each commit one coherent, independently valid change. Reuse checks for its unchanged
  tree/scope, not unrelated suites. Split unrelated edits; keep an enabling refactor separate
  from its behavior change.
- Establish working-tree and index scope from still-current supplied status; run
  `git status --short` when that evidence is missing or stale. Reuse current
  reviews and validation; repeat only checks whose results a later edit, hook, failure, or
  concurrent change can invalidate.
- Stage only intended paths or hunks, using explicit paths, interactive staging, or applying
  a reviewed patch to the index. If the index was empty and staging adds exactly the reviewed
  change, commit directly; otherwise review the relevant staged changes once. Keep unrelated
  working-tree and staged changes outside the commit, and ask before tracking a file that was
  untracked before the task.
- Use successful commit output to confirm completion. Check post-commit state when hooks or
  unexpected results can affect delivery.
- Commit with the configured signing. A signing failure or timeout usually means the user must
  unlock the key: report it as a blocker and retry after they respond. Commit unsigned or change
  signing configuration only when the user authorizes it.
- When squashing several commits into one, as in a squash merge, derive the message from
  theirs. Keep their reasons and consequences, and drop steps that the combined change no
  longer shows.

## Push

A push request publishes the current branch to its existing upstream. Tags, new remote branches,
force pushes, and a branch that is not the default or has diverged from its upstream each need the
user's explicit request. A local-only restriction on a ref stays until the user lifts it.

## Message format

```
<type>(<scope>): <subject>

<body>

<trailers>
```

- `type`: `feat`, `fix`, `perf`, `refactor`, `docs`, `test`, `build`, `ci`, `chore`, or `revert`.
- `scope`: optional; the affected component, package, or area, in lower case.
- `subject`: imperative mood, lower-case start, no trailing period, at most 72 characters
  including the prefix and any work reference. Name the concrete effect in the words someone
  searching the log would use: the behavior a fix corrects, the capability a feature adds, the
  structure a refactor creates. Follow a broad verb such as "align", "preserve", or "clarify"
  with the specific thing that changes, or pick a more specific verb.
- Work reference: when the user names a work item for the task, or the user's recent commits on
  the branch end their subjects with one, such as `(wp#123)`, end every subject with it. When
  recent subjects carry different references and the task names none, reuse the reference of the
  commit or item the change fixes or continues; ask which applies only for unrelated new work.
- Breaking change: add `!` after the type or scope and a `BREAKING CHANGE: <description>`
  trailer describing the migration.
- Trailers: `Fixes #123`, `Refs #123`, `Link: <url>`, `Co-authored-by:`, and any attribution
  the client or project requires, each on its own line after a blank line. In a public
  repository, add no trailer or body link that points to a private resource, such as a
  self-hosted tracker, because readers cannot open it.

### Body

Write the body for a maintainer who reads `git log` or `git blame` months later with the
repository but without the conversation, task notes, review rounds, or local runs behind the
commit. It records why the commit exists and what it changes; the diff already shows how.

- Keep it self-contained. Use the project's established names and plain words, and define any
  term the code does not already define, because labels coined while working mean nothing to
  that reader.
- Point to an external source through something the reader can open: an issue or pull request
  number, a URL, a commit SHA with its subject, or a path in the repository. When the source is
  private or temporary, such as a chat, a local run, or a review round, state the facts it
  contributed and leave out the name.
- Write short prose paragraphs in the order the type's format below gives, each answering one
  question. Most bodies run 3 to 12 lines; the reasoning sets the length, not the diff size.
- Open each paragraph with words that announce its role, because the paragraphs carry no labels
  and a reader scans their first words: a problem paragraph opens with its cause
  (`Because ...`) or, when the cause is unknown or self-evident, with `Previously,`; a change
  paragraph opens with the imperative verb of the action; an evidence paragraph opens with
  `Verified by`, `Measured with`, or a similar phrase.
- Mention behavior that stays unchanged only where a reader would expect it to change, such as a
  public API kept compatible through an internal rewrite.
- Back each claim with the most specific evidence that shows it: a named regression test that
  drives the failure, a before-and-after measurement with its method, or a reproduction with its
  observed result. Claim a failure without the change only when it was observed. State unverified
  parts as unverified.
- When one commit carries several user-visible changes, as a squash can, give each its own
  paragraph or list item with its own reason.
- Wrap at 72 columns; a URL or trailer may run longer.

Omit the body only when the subject alone tells that reader why the commit exists, as for most
`chore` commits, typo fixes, and mechanical updates.

### Formats by type

Before writing the body of a `fix`, `perf`, `feat`, `refactor`, or `test` commit, read the
matching reference: [fix](references/fix.md), [perf](references/perf.md),
[feat](references/feat.md), [refactor](references/refactor.md), [test](references/test.md).

- `docs`: what readers lacked or had wrong, and what the document now gives them. Subject only
  for a typo or link fix.
- `chore`, `build`, `ci`: usually one line. Add a body when the reason is not evident, such as
  why a dependency moved (an advisory or a needed upstream fix, linked), what generated content
  was refreshed from which source or command, or what a pipeline change fixes or enables.
- `revert`: keep Git's `This reverts commit <sha>.` line and say why: what the reverted commit
  broke, with a pointer to the failure, or why its approach is withdrawn.

Pass a multi-line message as real lines through a quoted heredoc, `git commit -F - <<'EOF'`.
Git and the shell keep a `\n` escape inside `-m` quotes as a literal backslash and `n`, including
when a tool-call string supplies the command. If message formatting is uncertain, inspect the
stored message with `git log -1 --format=%B`.

## Follow-up fixes

A correction to an unpublished commit goes into that commit, not into a new standalone commit
such as `fix typo` or `address review`. A commit is unpublished when no remote-tracking branch
contains it (`git branch -r --contains <sha>` prints nothing) and no one else builds on it, even
when it sits on the local default branch. Replacing the target's approach, including at the
user's request, is a correction to it.

1. Find the commit that introduced the code being corrected: `git log --oneline <base>..HEAD`,
   `git blame`, or `git log -L <range>:<file>`.
2. Stage only the hunks for that target. When a follow-up touches several earlier commits,
   make one fixup per target. A fixup must apply cleanly at its target's position, so a hunk
   that depends on a later commit belongs to that later commit.
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
is a distinct change worth its own history entry rather than a revision of the target. Also make a
regular commit when the client refuses a fold the user did not request, and mention the refusal.

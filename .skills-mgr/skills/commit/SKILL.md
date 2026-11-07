---
name: commit
description: Plan, write, revise, or push git commits, including folding follow-up fixes into earlier commits.
disable-model-invocation: false
---
# Commit

## What to do

- Commit only the authorized work. Make each commit one coherent, independently valid change;
  split unrelated changes and keep enabling refactors separate from behavior changes.
- Keep unrelated working-tree and staged changes out of the commit. Ask before tracking files
  that were untracked before the task.
- Reuse environment facts, recent inspection, and validation while they remain current for the
  relevant scope. Inspect only missing or invalidated information needed for the next action,
  not a routine status, branch, index, diff, or history checklist.
- Fold corrections into their unpublished target commits, including pending `fixup!`/`amend!`
  markers, before completion. Use a separate commit for a distinct change or a published target.
  Rewriting published or shared history requires explicit authorization.
- Keep configured signing. Report signing failures as blockers rather than bypassing signing.
  Successful commit output confirms completion unless hooks or unexpected results require more.
- Push only when requested, to the current branch's existing upstream. Tags, new remote branches,
  force pushes, and pushing a non-default or diverged branch require explicit authorization.
  Preserve local-only restrictions; a commit or push request does not cover later tasks.

## Classification

Choose the type by the change's effect, not the files touched.

| Type | Use for |
| --- | --- |
| `feat` | A capability users, callers, or operators can reach. |
| `fix` | Correcting behavior that was wrong. |
| `perf` | Reducing resource cost without changing intended behavior. |
| `refactor` | Changing structure without changing intended behavior. |
| `docs` | Reader documentation. |
| `test` | Tests or test infrastructure without production behavior changes. |
| `build` | Build tooling or dependencies. |
| `ci` | Automation pipelines. |
| `chore` | Maintenance that fits none of the above. |
| `revert` | Reversing an earlier commit. |

## Message format

Documented project conventions take precedence.

```text
<type>(<scope>): <subject>

<body>

<trailers>
```

- Scope is optional: the affected component, package, or area, in lower case.
- Subject: imperative, lower-case start, no trailing period, at most 72 characters including
  the prefix and work reference. Name the concrete effect in words someone searching the log
  would use, not a vague action such as "align" or "update" alone.
- Append the task's work reference when supplied or already established for the change, following
  the project's convention. Do not borrow an unrelated recent commit's reference.
- Breaking changes use `!` after the type or scope and a `BREAKING CHANGE:` trailer explaining
  the migration.
- Trailers such as `Fixes #123`, `Refs #123`, `Link: <url>`, and `Co-authored-by:` go on separate
  lines after a blank line. Include required attribution; keep private resource links out of
  public commit messages.

### Body

Write for a maintainer reading the history months later without the conversation. Explain why
the change exists and what it changes, not a file-by-file account of the diff. Use established
project names and short paragraphs, generally 3 to 12 lines, wrapped at 72 columns. URLs and
trailers may run longer.

Use the matching reference below for paragraph order and examples. Include only supported
evidence; distinguish observed results from expectations and unverified claims. Reference sources
readers can open. For private or temporary sources, state the relevant facts without their labels
or links. These are message-writing rules, not instructions to run additional checks.

Omit the body when the subject alone explains why the commit exists. For a squash, derive the
message from the combined changes, retain their reasons and consequences, and omit superseded
intermediate steps. Give distinct user-visible changes their own paragraph or list item.

### Message references

Read the matching reference when writing a `feat`, `fix`, `perf`, `refactor`, or `test` body:
[feat](references/feat.md), [fix](references/fix.md), [perf](references/perf.md),
[refactor](references/refactor.md), [test](references/test.md).

- `docs`: what readers lacked or had wrong, and what the document now gives them.
- `chore`, `build`, `ci`: usually subject only; explain non-obvious reasons, sources of generated
  content, or what a dependency or pipeline change fixes or enables.
- `revert`: keep `This reverts commit <sha>.` and explain the failure or reason for withdrawal.

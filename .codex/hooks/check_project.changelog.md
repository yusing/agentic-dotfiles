# Changelog

## 1.2.0

Include the current branch in the existing Git VCS and submodule labels:
`git@branch@<HEAD>` and `path@branch@<HEAD>`. Unborn branches have no
commit suffix; detached checkouts retain their SHA-only labels. Branches
follow each checkout, including linked worktrees and nested submodules.

## 1.1.0

List nested Git submodules under `submodules:` when any exist. Each entry is
the path from the repository root, plus `@` and the 8-character HEAD prefix
when that checkout has a commit. `--without-git` still prints the list.
The VCS line also carries the worktree's own Git HEAD and SVN revision:
`git@` plus that same prefix, and `svn@r` plus the revision from
`svn info --show-item revision`. A missing commit or revision leaves that
side's token unadorned.

## 1.0.1

Wrap the report in `<project>` fences. Omit `project_instructions: |` when
neither VCS nor a task runner adds an instruction.

## 1.0.0

Initial scriptc-compiled TypeScript release of project VCS, task-runner, and language detection.

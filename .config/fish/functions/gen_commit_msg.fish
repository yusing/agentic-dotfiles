# Commit message generators (shared helpers + Claude / agent entrypoints).
# Loaded from conf.d/gen_commit_msg.fish

function _gen_commit_msg_system_prompt
    set prompt "## Role

You draft high-signal git commit messages that match the repository's existing history and the
staged diff.

## Mission

Produce a commit message that describes only the staged changes. Infer the change type and impact
carefully from the diff and surrounding context.

## Rules

- Describe only staged changes; ignore unstaged and untracked work.
- Do not invent changes or motivations that are not supported by the staged diff or inspected files.
- Match the repository's recent commit style when possible.
- Identify the most accurate change type, such as feat, fix, refactor, test, perf, chore, docs,
  style, or ci.
- Infer an appropriate scope/impact level from the staged changes.
- You may inspect related files if the diff alone is ambiguous.

## Output format

Output the commit message only:
- subject on the first line
- blank line
- body only if needed

Do not output fences, commentary, or extra explanation.

## Body constraints

- Keep each body line <= 80 characters.
- Break lines at natural punctuation or connectives.
- Use at most 3 paragraphs."
    _gen_normalize_prompt "$prompt"
end

function _gen_commit_msg_common
    set -l workdir (pwd)

    set -l staged_paths (git diff --staged --name-only)
    if test -z "$staged_paths"
        return 1
    end

    set -l git_status (git status --short --porcelain --untracked-files=no | grep -Ff (printf '%s\n' $staged_paths | psub))
    if test -z "$git_status"
        return 1
    end

    set -l git_branch (git branch --show-current 2>/dev/null)
    if test -z "$git_branch"
        set git_branch "(detached)"
    end

    set -l git_stats (git diff --staged --stat)
    set -l git_recent_commits (git log --format="%H %s%n%b" --max-count 5)

    set -l patch_max_lines 800
    set -l patch_tmp (mktemp)
    git diff --staged -U3 >$patch_tmp
    set -l patch_lines (string split ' ' (string trim (wc -l $patch_tmp)))[1]
    if test -z "$patch_lines"
        set patch_lines 0
    end
    set -l git_staged_patch
    if test $patch_lines -gt $patch_max_lines
        set git_staged_patch (head -n $patch_max_lines $patch_tmp | string collect)
        set git_staged_patch "$git_staged_patch

_(Staged diff truncated at $patch_max_lines lines; full patch has $patch_lines lines. Run \`git diff --staged\` locally for the remainder.)_"
    else
        set git_staged_patch (cat $patch_tmp | string collect)
    end
    rm -f $patch_tmp

    set -l prompt "## Current directory

$workdir

## Current branch

$git_branch

## Staged paths

These are the authoritative staged paths.

```
$staged_paths
```

## Recent commits

Use these as style reference only, but when if previous commit message contains task id, i.e. (T12345) you MUST include it.

```
$git_recent_commits
```

## Git status

$git_status

## Git stats

$git_stats

## Staged diff

This is from \\`git diff --staged -U3\\`.
\\`-U3\\` means each hunk includes 3 lines of surrounding context.

````diff
$git_staged_patch
````

$EXTRA_PROMPT"
    _gen_normalize_prompt "$prompt"
end

function _gen_commit_msg_agent_prompt -a system_prompt -a user_prompt
    set -l prompt "## System prompt

$system_prompt

## User prompt

$user_prompt"
    _gen_normalize_prompt "$prompt"
end

function _gen_commit_msg_system_prompt_amend
    set prompt "## Role

You write the commit message for \\`git commit --amend\\`. After amend, there is only one commit vs
its parent: describe that single result. Readers never see a separate \\\"amend patch\\\" or \\\"what
changed since the last message\\\"—so your text must not sound like a follow-up or addendum.

## Mission

Summarize the **full** commit versus its parent (or versus an empty tree on root), as if this were
always a normal single commit. When a \\\"full amended vs parent\\\" diff is supplied, treat it as the
only source of truth for **what** to describe; reuse or lightly edit the prior subject/body for tone,
scope, and task ids—not as a scaffold to \\\"patch\\\" with incremental sentences.

## Rules

- **One narrative.** Never frame the body as \\\"also\\\", \\\"additionally\\\", \\\"now\\\", \\\"this amend\\\",
  \\\"on top of the previous commit\\\", or \\\"still X, but now Y\\\". No meta commentary about rewriting,
  squashing, or staging.
- **No delta voice.** Sections that split \\\"HEAD\\\" vs \\\"staged\\\" are internal context only; do not
  title or imply two layers of change in the message. Do not imply you are merging two stories.
- **Substance over process.** Avoid implementation churn that is not meaningful to reviewers (e.g. \\\"we
  used constants instead of CLI flags\\\", \\\"edit in-file\\\") unless it is genuinely the behavioral
  contract of the change.
- If staged matches HEAD (no delta): message-only polish—align wording with HEAD vs parent only.
- Do not invent files, bugs, or intent unsupported by diffs or the prior message text.
- Match repository style when possible (type prefix, scopes, task ids such as T12345).

## Output format

Output the commit message only:
- subject on the first line
- blank line
- body only if needed

Do not output fences, commentary, or extra explanation.

## Body constraints

- Keep each body line <= 80 characters.
- Break lines at natural punctuation or connectives.
- Use at most 3 paragraphs."
    _gen_normalize_prompt "$prompt"
end

function _gen_commit_msg_patch_to_text -a patch_tmp -a patch_max_lines
    set -l patch_lines (string split ' ' (string trim (wc -l $patch_tmp)))[1]
    if test -z "$patch_lines"
        set patch_lines 0
    end
    set -l git_patch
    if test $patch_lines -gt $patch_max_lines
        set git_patch (head -n $patch_max_lines $patch_tmp | string collect)
        set git_patch "$git_patch

_(Diff truncated at $patch_max_lines lines; full patch has $patch_lines lines.)_"
    else
        set git_patch (cat $patch_tmp | string collect)
    end
    printf '%s' "$git_patch"
end

function _gen_commit_msg_amend_common
    set -l workdir (pwd)
    git rev-parse --is-inside-work-tree >/dev/null 2>&1; or return 1
    git rev-parse HEAD >/dev/null 2>/dev/null; or return 1

    set -l git_branch (git branch --show-current 2>/dev/null)
    if test -z "$git_branch"
        set git_branch "(detached)"
    end

    set -l patch_max_lines 800

    set -l prev_commit_message (git log -1 --format=%s%n%n%b | string collect)

    set -l head_show_stat_tmp (mktemp)
    git show --stat HEAD >$head_show_stat_tmp 2>/dev/null
    set -l git_head_show_stat (cat $head_show_stat_tmp | string collect)
    rm -f $head_show_stat_tmp

    set -l head_patch_tmp (mktemp)
    git show -U3 --pretty=format: HEAD >$head_patch_tmp
    set -l git_head_patch (_gen_commit_msg_patch_to_text $head_patch_tmp $patch_max_lines)
    rm -f $head_patch_tmp

    set -l amend_stat (git diff --staged --stat | string collect)
    set -l amend_paths (git diff --staged --name-only)
    set -l amend_delta_note "Internal: \\\`git diff --staged\\\` (index vs current HEAD). Do not describe this as a separate layer in the commit message."
    set -l amend_patch_tmp (mktemp)
    git diff --staged -U3 >$amend_patch_tmp
    set -l amend_lines (string split ' ' (string trim (wc -l $amend_patch_tmp)))[1]
    if test -z "$amend_lines"
        set amend_lines 0
    end
    set -l git_amend_patch
    if test $amend_lines -eq 0
        set git_amend_patch "(no staged changes vs HEAD — message-only amend or equivalent index match.)"
        set amend_delta_note "Staged matches HEAD; no code delta. Polish the message to match HEAD vs parent only."
    else
        set git_amend_patch (_gen_commit_msg_patch_to_text $amend_patch_tmp $patch_max_lines)
    end
    rm -f $amend_patch_tmp

    set -l parent (git rev-parse HEAD^ 2>/dev/null)
    set -l full_amend_section ""
    if test -n "$parent"
        set -l full_stat (git diff --cached --stat HEAD^ | string collect)
        set -l full_patch_tmp (mktemp)
        git diff --cached HEAD^ -U3 >$full_patch_tmp
        set -l git_full_patch (_gen_commit_msg_patch_to_text $full_patch_tmp $patch_max_lines)
        rm -f $full_patch_tmp
        set full_amend_section "## Full amended commit vs parent (authoritative result)

This is \\\`git diff --cached HEAD^ -U3\\\` and \\\`git diff --cached --stat HEAD^\\\` (index vs parent of HEAD):
the tree that will become the new commit after \\\`git commit --amend\\\`.

### Stat

\`\`\`
$full_stat
\`\`\`

### Patch

````diff
$git_full_patch
````

"
    else
        set full_amend_section "## Full amended vs parent

No HEAD^ (root commit). Describe the resulting **first commit** as one unit versus the empty tree.
Use \\\"HEAD show\\\" and \\\"staged vs HEAD\\\" below only when disambiguating; never narrate two layers.

"
    end

    set -l git_recent (git log --format="%H %s%n%b" --max-count=6)

    set -l unified_note "## How to read the rest

- When \\\"full amended vs parent\\\" is present, **base the written message on that** (one commit vs
  parent only).
- \\\"HEAD\\\" vs \\\"staged\\\" below is diagnostic only; readers will not see that split."

    set -l prompt "## Current directory

$workdir

## Current branch

$git_branch

$unified_note

$full_amend_section

## Previous commit message (HEAD)

Reuse subject shape, scopes, or task ids if they still describe the **full** diff above; rewrite if not.
Do not append sentences that only make sense relative to \\\"what was already in HEAD\\\" versus \\\"what
staging adds\\\":

\`\`\`
$prev_commit_message
\`\`\`

## Reference only — HEAD vs staged (do not dual-narrate)

### \\\`git show\\\` of current HEAD (before amend completes)

Stat:

\`\`\`
$git_head_show_stat
\`\`\`

Patch:

````diff
$git_head_patch
````

### Staged vs HEAD ($amend_delta_note)

Stat:

\`\`\`
$amend_stat
\`\`\`

Paths:

\`\`\`
$amend_paths
\`\`\`

Patch:

````diff
$git_amend_patch
````

## Recent commits

\`\`\`
$git_recent
\`\`\`

$EXTRA_PROMPT"
    _gen_normalize_prompt "$prompt"
end

function gen-commit-msg-claude -a model
    if test -z "$model"
        set model haiku
    end

    set -l system_prompt (_gen_commit_msg_system_prompt)
    if test $status -ne 0
        return 1
    end

    set -l prompt (_gen_commit_msg_common)
    if test $status -ne 0
        return 1
    end

    echo "$prompt" | claude -p --model "$model" --system-prompt "$system_prompt" --no-chrome --strict-mcp-config --tools "Glob,Bash,Grep,Read" --allowedTools "Bash(grep *) Bash(rg *) Bash(find *) Bash(ls *) Bash(cd *) Bash(git show *) Bash(git diff *) Bash(git log *) Bash(git reflog *) Read(*) Glob(*) Grep(*) Skill(*)"
end

function gen-commit-msg -a model
    set -l cmd git-agent commit-msg --fast
    if test -n "$model"
        set -a cmd --model "$model"
    end
    command $cmd
end

function gen-commit-msg-cursor -a model
    if test -z "$model"
        set model auto
    end

    set -l system_prompt (_gen_commit_msg_system_prompt)
    if test $status -ne 0
        return 1
    end

    set -l user_prompt (_gen_commit_msg_common)
    if test $status -ne 0
        return 1
    end

    set -l prompt (_gen_commit_msg_agent_prompt "$system_prompt" "$user_prompt")

    agent -p --model "$model" --trust --skip-worktree-setup -f "$prompt"
end

function gen-commit-msg-amend-claude -a model
    if test -z "$model"
        set model haiku
    end

    set -l system_prompt (_gen_commit_msg_system_prompt_amend)
    if test $status -ne 0
        return 1
    end

    set -l prompt (_gen_commit_msg_amend_common)
    if test $status -ne 0
        return 1
    end

    echo "$prompt" | claude -p --model "$model" --system-prompt "$system_prompt" --no-chrome --strict-mcp-config --tools "Glob,Bash,Grep,Read" --allowedTools "Bash(grep *) Bash(rg *) Bash(find *) Bash(ls *) Bash(cd *) Bash(git show *) Bash(git diff *) Bash(git log *) Bash(git reflog *) Read(*) Glob(*) Grep(*) Skill(*)"
end

function gen-commit-msg-amend -a model
    set -l cmd git-agent commit-msg --amend
    if test -n "$model"
        set -a cmd --model "$model"
    end
    command $cmd
end

function gen-commit-msg-amend-cursor -a model
    if test -z "$model"
        set model composer-2-fast
    end

    set -l system_prompt (_gen_commit_msg_system_prompt_amend)
    if test $status -ne 0
        return 1
    end

    set -l user_prompt (_gen_commit_msg_amend_common)
    if test $status -ne 0
        return 1
    end

    set -l prompt (_gen_commit_msg_agent_prompt "$system_prompt" "$user_prompt")

    agent -p --model "$model" --trust --skip-worktree-setup -f "$prompt"
end

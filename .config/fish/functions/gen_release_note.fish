# Release note generators (shared helpers + Claude / agent entrypoints).
# Loaded from conf.d/gen_release_note.fish

function _gen_release_note_peel -a label ref
    # Peel tags/branches/commits to blob-less commit hash (suffix ^0 peels annotated tags).
    if test -z "$ref"
        echo "gen-release-note: empty $label revision" >&2
        return 1
    end

    set -l c (git rev-parse --verify "$ref^0" 2>/dev/null)
    if test $status -ne 0
        echo "gen-release-note: revision not found for $label: $ref" >&2
        echo "hint: cd to godoxy repo root, then git fetch --tags <remote>" >&2
        echo "hint: git tag -l '<prefix>*' lists local tags matching a release series" >&2
        return 1
    end
    printf '%s\n' "$c"
end

function _gen_release_note_submodule_gitlink -a git_ref sub_path
    set -l line (git ls-tree $git_ref -- $sub_path 2>/dev/null | string trim)
    if test -z "$line"
        echo ""
        return 0
    end
    set -l left (string split \t -- $line)[1]
    set -l parts (string split ' ' -- $left)
    if test (count $parts) -lt 3
        echo ""
        return 0
    end
    if test $parts[2] != commit
        echo ""
        return 0
    end
    echo $parts[3]
end

function _gen_release_note_gitmodules_table
    if not test -f .gitmodules
        echo "(no .gitmodules at repo root)"
        return 0
    end
    set -l rows
    # `git config --get-regexp` may use space separators; `git config -l` uses `key=value` portably.
    for line in (git config -f .gitmodules -l)
        string match -qr '^submodule\..+\.path=' -- $line || continue
        set -l parts (string split -m1 = -- $line)
        test (count $parts) -ge 2 || continue
        set -l key $parts[1]
        set -l sub_path $parts[2]
        test -n "$sub_path" || continue
        set -l k (string replace -r '^submodule\.' '' -- $key)
        set -l sm_name (string replace -r '\.path$' '' -- $k)
        set -l url (git config -f .gitmodules --get submodule.$sm_name.url 2>/dev/null)
        if test -z "$url"
            set url "(missing url in .gitmodules)"
        end
        set -a rows "- Path $sub_path: $url"
    end
    if test (count $rows) -eq 0
        echo "(no submodule.path entries parsed)"
        return 0
    end
    string join \n -- $rows
end

function _gen_release_note_submodule_logs_between -a base_version release_version
    if not test -f .gitmodules
        printf '%s' ""
        return 0
    end

    set -l max_commits 120
    set -q GEN_RELEASE_NOTE_SUBMODULE_LOG_LIMIT
    and set max_commits $GEN_RELEASE_NOTE_SUBMODULE_LOG_LIMIT

    set -l mf '```'
    set -l blocks

    for line in (git config -f .gitmodules -l)
        string match -qr '^submodule\..+\.path=' -- $line || continue
        set -l parts (string split -m1 = -- $line)
        test (count $parts) -ge 2 || continue
        set -l sub_path $parts[2]
        test -n "$sub_path" || continue

        set -l old_tip (_gen_release_note_submodule_gitlink $base_version $sub_path)
        set -l new_tip (_gen_release_note_submodule_gitlink $release_version $sub_path)

        test -n "$new_tip" || continue
        test "$old_tip" != "$new_tip" || continue

        if not test -d $sub_path
            set -a blocks (string join \n \
                "## Submodule commits: $sub_path (gitlink $old_tip .. $new_tip)" "" \
                "(check out submodules locally to populate commit messages)")
            continue
        end

        if test -z "$old_tip"
            set -l one_line (git -C $sub_path log -1 --format="%H %s%n%b" $new_tip 2>/dev/null)
            set -a blocks (string join \n \
                "## Submodule commits: $sub_path (introduced / repointed to $new_tip)" "" "$mf" "$one_line" "$mf")
            continue
        end

        set -l total (git -C $sub_path rev-list --count $old_tip..$new_tip 2>/dev/null)
        set -l slog
        set -l truncated_note ""
        if test "$max_commits" != 0 && test -n "$total" && test "$total" -gt "$max_commits"
            set slog (git -C $sub_path log -n "$max_commits" --format="%H %s%n%b" $old_tip..$new_tip 2>/dev/null)
            set truncated_note "Submodule path $sub_path: $total commits between tips - showing the newest $max_commits only. Set GEN_RELEASE_NOTE_SUBMODULE_LOG_LIMIT=0 for an uncapped chronological log."
        else
            set slog (git -C $sub_path log --reverse --format="%H %s%n%b" $old_tip..$new_tip 2>/dev/null)
        end
        if test -z "$slog"
            set -a blocks (string join \n \
                "## Submodule commits: $sub_path ($old_tip..$new_tip)" "" \
                "(no local diff; pointer changed or shallow history)")
            continue
        end

        set -a blocks (string join \n \
            "## Submodule commits: $sub_path ($old_tip..$new_tip)" "" "$truncated_note" "" "$mf" "$slog" "$mf")
    end

    if test (count $blocks) -eq 0
        printf '%s' ""
        return 0
    end
    string join \n\n -- $blocks
end

function _gen_release_note_is_godoxy_repo
    set -l root (git rev-parse --show-toplevel 2>/dev/null)
    if test -z "$root"
        return 1
    end

    set -l base (string match -r '[^/]+$' -- $root)
    test "$base" = godoxy
end

function _gen_release_note_repo_label
    if _gen_release_note_is_godoxy_repo
        echo "GoDoxy (reverse proxy)"
    else
        echo "this repository"
    end
end

function _gen_release_note_webui_note
    if _gen_release_note_is_godoxy_repo
        echo "The Web UI is the webui submodule in-repo: one shipped product, not a separate release pipeline, unless edits are wiki-only assets."
    end
end

function _gen_release_note_system_prompt
    set -l repo_label (_gen_release_note_repo_label)
    set -l webui_note (_gen_release_note_webui_note)

    set prompt "## Role

You draft GitHub Release body Markdown for $repo_label.

$webui_note

Audience: admins upgrading a running deployment.

## Mission

Lead with user-facing impact: behavior, config, installer, docs, migration. Prefer release-note
wording over dev-facing jargon. Skip implementation detail unless needed for upgrade or user story.
Do not repeat same story in multiple sections.
For schema/API/internal-sync commits, say user effect or migration step. Do not describe sync work
itself.
Avoid meta prose about generated docs/clients, schema churn, field reordering, or 'keeping server
and docs in sync'. Say user effect or migration step instead.

## Style

Plain ASCII punctuation in prose (hyphen instead of Unicode dash). Prefer short lines (**wrap near
column 85**).

When naming a submodule checkout or upstream repo inline, use Markdown hyperlink syntax LABEL in brackets
then URL in parentheses sourced from Submodule remotes. For commit links, strip trailing `.git` from
repo URL before appending `/commit/<sha>`. Do NOT use INLINE_CODE NAME INLINE_CODE followed by bare URL
parentheses that is NOT a clickable Markdown link.

## Include

Breaking changes with migration cues, bug fixes with user-visible symptom, portability/install hits,
user-facing improvements, docs, installer changes, submodule bumps that ship user-visible behavior.

## Exclude

Pure refactors, CI-only narration, bumps with no observable effect, dev-only API chatter, speculative
tone, preamble phrases listed below.
Any sentence whose point is internal sync, generated artifact parity, field reorder, or schema churn
instead of user-facing change or migration step.

Omit **Summary** sections for patch/minor releases when Breaking / Bug Fixes / Improvements already
carry the story (no duplicate narratives).

Forbidden headings: combining product name ''GoDoxy'' plus a semver token like ''v'' plus digits after a
separator (mirror of the Release title GitHub prints).

Typical headings use **three hash marks plus space**: ### Breaking Changes, ### Bug Fixes, ### Improvements,
### Configuration Changes, ### Full Changelog. Omit empties.

## Output shape

1. **No preamble.** First printable line MUST start with \"### \" plus a section name (triple hash plus
   ASCII space). Forbidden before it: narration, apologies, tooling, ''HERE IS'', ''DRAFT'',
   ''copy-ready'', ''verified tag'', etc.
2. First section is whichever is earliest in this priority that has content: Breaking Changes, then
   Security, then New Features, then Bug Fixes, then Improvements, then Configuration blocks. Do
   **not** open with Summary.
3. Every heading has content under it immediately (bullets or short paragraphs).

## Full Changelog (required layout)

End with ### Full Changelog whenever the tag range touched code.

Never print a subtitle that names this releasing repository plus its HTTPS URL readers already have from
GitHub Releases (omit lines like literal words Main repository plus open-paren canonical godoxy URL).

Start changelog body immediately with parent-repo commits, one bullet per commit, in format:
Commit title (commit SHA)
where commit title is subject line and commit SHA is full hash. No nested bullets under Full Changelog.

Submodule groupings AFTER parent commits:

- Submodule groups only when gitlink moved and the USER prompt fenced submodule log lists commits.

- Immediately before that submodule commit list put ONE Markdown link line naming checkout in SHORT
  directory form appearing in Submodule remotes (webui, goutils, internal slash whatever). REQUIRED syntax example
  meaning use real URL from table OPEN square bracket webui CLOSE square bracket OPEN paren https colon slash
  slash github dot com slash yusing slash godoxy-webui CLOSE paren with no surrounding backticks AND no duplicated
  bare URL in parentheses afterward. Optionally wrap entire link inside bold wrappers if you preserve link syntax.

Incorrect forbidden patterns: BACKTICK webui BACKTICK space OPEN PAREN bare URL CLOSE PAREN, or LABEL space
bare URL without hyperlink.

Classification rules (critical - common model failure mode):

**A.** Only SHAs introduced by a PARENT commit entry go in parent commit list directly under ###
Full Changelog. A parent begins with ONE forty-hex-char line followed by subject. EVERY such SHA in Parent-
repository commit log appears exactly once here. Still no repository banner line ahead of those bullets.

**B.** Submodule fenced logs remain authoritative list membership for subgroup bullets; never scrape SHAs
from parent commit MESSAGE bodies. Never place a Parent top-level SHA into a subgroup.

**C.** Narrative bullets earlier: link each forty-char cite to whichever repository owns that SHA (parent URLs
versus Submodule remotes row for fence membership). Never invert.

**D.** Skip a submodule subgroup when its fence lacks commit lines.

Enumeration order mirrors Parent log then each submodule fenced block ordering unless EXTRA_PROMPT overrides.

Entry format unchanged: hyphen link-line then two-space indent hyphen subject.

Submodule remotes dictate exact repo URL spelling for non-commit links; commit links drop trailing `.git`
before `/commit/<sha>`.

## Misoutputs to forbid

Repeated paste of identical sections (only one Breaking / Bugs / Improvements / Full Changelog per release).
Notebook-style chatter (Wait, fixes, apologies, verifying). Italic emphasis wrappers where bold plus short
hyphen wording suffices.
Any commit summary that explains only internal sync, generated docs/client parity, schema refresh, or
field ordering instead of user-facing effect is forbidden.

## Writing rules

Present tense where natural for operators. Inline SHA citations respect repository membership rule C. Stop
when changelog ends.

Full Changelog shape:
- parent commits: `Commit title (commit SHA)`
- submodule commits: link line, then `Commit title (<trimmed-url/commit/sha>)`
- no nested bullets under Full Changelog
- no umbrella notes like `(parent umbrella in SHA)` or `(bundle refresh in parent SHA)`; fold that meaning
  into nearby prose or skip it when user-facing value unclear."
    _gen_normalize_prompt "$prompt"
end

function _gen_release_note_common -a base_version -a release_version
    if test -z "$base_version"; or test -z "$release_version"
        echo "usage: gen-release-note <base_version> <release_version> [config|model]" >&2
        return 1
    end

    set -l base_c (_gen_release_note_peel base "$base_version")
    if test $status -ne 0
        return 1
    end
    set -l rel_c (_gen_release_note_peel release "$release_version")
    if test $status -ne 0
        return 1
    end

    set -l git_log (git log --format="%H %s%n%b" "$base_c..$rel_c")
    if test $status -ne 0
        echo "gen-release-note: git log '$base_version..$release_version' failed (check range order)" >&2
        return 1
    end

    # Command substitution splits on newlines; wrap multiline blobs with string collect.
    set -l sm_urls (_gen_release_note_gitmodules_table | string collect)
    set -l sm_logs (_gen_release_note_submodule_logs_between "$base_c" "$rel_c" | string collect)

    set -l sm_block ""
    if test -n "$sm_logs"
        set sm_block "

## Submodule commits (gitlink range to local log)

$sm_logs

"
    end

    # Backticks in double-quoted prompts would run command substitutions; keep fences in a single-quoted literal.
    set -l md_fence '```'

    set -l prompt "## Release range

Base version: $base_version
Release version: $release_version

## Submodule remotes (.gitmodules; use exactly these for submodule commit links)

$sm_urls

## Parent-repository commit log

$md_fence
$git_log
$md_fence
$sm_block"

    if _gen_release_note_is_godoxy_repo
        set prompt "$prompt

Treat Web UI as part of one GoDoxy release body."
    end

    set prompt "$prompt

$EXTRA_PROMPT"

    _gen_normalize_prompt "$prompt"
end

function _gen_release_note_agent_prompt -a system_prompt -a user_prompt
    set -l prompt "## System prompt

$system_prompt

## User prompt

$user_prompt"
    _gen_normalize_prompt "$prompt"
end

function gen-release-note -a base_version -a release_version -a config
    set -l cmd git-agent release-note --fast
    if test -n "$config"
        set -a cmd --model "$config"
    end
    set -a cmd "$base_version" "$release_version"
    command $cmd
end

function gen-release-note-claude -a base_version -a release_version -a config
    if test -z "$config"
        set config (realpath ~/.claude/settings.json)
    end

    set -l system_prompt (_gen_release_note_system_prompt)
    if test $status -ne 0
        return 1
    end

    set -l prompt (_gen_release_note_common $base_version $release_version)
    if test $status -ne 0
        return 1
    end

    echo "$prompt" | claude -p --settings "$config" --system-prompt "$system_prompt" --no-chrome --strict-mcp-config --tools "Glob,Bash,Grep,Read,Skill" --allowedTools "Bash(grep *) Bash(ls *) Bash(cd *) Bash(git *) Read(*) Glob(*) Grep(*) Skill(*)"
end

function gen-release-note-cursor -a base_version -a release_version -a model
    if test -z "$model"
        set model composer-2-fast
    end

    set -l system_prompt (_gen_release_note_system_prompt)
    if test $status -ne 0
        return 1
    end

    set -l user_prompt (_gen_release_note_common $base_version $release_version)
    if test $status -ne 0
        return 1
    end

    set -l prompt (_gen_release_note_agent_prompt "$system_prompt" "$user_prompt")

    agent -p --model "$model" --trust --skip-worktree-setup -f "$prompt"
end

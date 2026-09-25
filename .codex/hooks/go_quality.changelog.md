# Changelog

## 1.0.3

Summarize `go fix` rewrites and `gofmt` formatting separately in one line with
the retained per-command diff path. Formatting-only changes no longer print an
inline diff or line ranges. Keep `go fix` rewrites, unexpected sibling restores,
and auto-fix failures visible inline; a report path accompanies all notices.

## 1.0.2

Stay silent when `go fix` or `gofmt` stops on the edited sources' own compile or
parse diagnostics, such as an edit sequence that has not built yet. Those files
are retried by the next Go edit, so repairing the build also fixes and formats
them, and Stop still reports anything left. Other auto-fix failures name the
first diagnostic line instead of the `# package` header.

## 1.0.1

Omit the changed-file list from Stop findings. The findings themselves still
identify affected files without repeating every edited Go path.

## 1.0.0

Record Go-project quality baselines in the background at session start, outside
the writer gate, and fence potential Go writes until the baseline is ready. The
writer gate only keeps diff attribution clean and never denies a tool: a failed
same-session non-shell holder is reconciled by the next tool, other holders get
a short wait while fresh, and Stop reconciles every writer the session still
holds. Read-only shell commands skip the gate and snapshots. Unreadable
directories, the Go module cache, and hook errors do not block tools, and
unchanged Stop findings after a continuation are reported instead of blocking
again. Respect explicit `GOWORK`
selection, including custom workspace paths, and refresh each command's
source preimage under the writer gate. A first project-creation tool captures
pre-existing loose Go sources and discoverable workspace members before editing,
so unrelated files are not reported or auto-fixed while same-call member edits
retain attribution, including quoted paths and existing member findings.
Preserve the fenced module state if an ancestor go.work is introduced in the
same tool; failed creation retains diff attribution. Track edits after tool calls,
apply package-scoped `go fix` for Go 1.26+ targets, keeping its edits only in
the files the tool changed so untouched siblings are not rewritten after every
revert, format changed files with `gofmt`, then save private per-command unified diffs. Continue a finishing
turn only for new `go fix`, `golangci-lint`, or `deadcode` findings after Go
files change.
A failed-tool reconcile names `PostToolUseFailure` in its context so
clients that validate the event name accept it.
Project creation counts only a `go.mod` or `go.work` written at the cwd or an
ancestor, resolved through each shell segment's `cd`; a manifest written
elsewhere, behind a `$` expansion, or inside quotes does not start a pending
project. Post-edit context carries only what `go fix` or `gofmt` rewrote after
the tool, as a `-U0` diff from the tool's output, or as changed line ranges with
the report path when that diff exceeds 40 lines, plus auto-fix errors; an edit
the hook leaves unchanged, or
one with no Go project yet, is silent. Every edit still saves its report. Stop
no longer reports reconciled writers unless it also blocks.

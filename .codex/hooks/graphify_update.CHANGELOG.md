# Changelog

## 1.4.0

Map Devin CLI `PostToolUse` command, edit, and notebook-edit completions
(resolving `DEVIN_PROJECT_DIR` / process `cwd` and aliasing `exec` to `Bash`)
to the shared refresh policy.

## 1.3.0

Map Antigravity command and edit completions to the shared refresh policy.

## 1.2.1

Report an earlier refresh failure on the next inspection without launching a
new refresh.

## 1.2.0

Skip literal read-only shell inspections before dispatching a refresh.

## 1.1.0

Return without waiting for Graphify: start a detached, coalescing
`graphify-report --update --queue` refresh for the resolved root. Report a failure
recorded by an earlier background refresh once, on the next call.

## 1.0.2

Run the maintained graphify-report update entry point, applying Cargo workspace
exclusions before extraction and rendering compact reports even for unchanged
graphs. Keep Graphify unmodified and repair reports without reclustering.

## 1.0.1

Create code graphs and navigation reports at Git roots on first use. Repair missing
reports even when Graphify skips an unchanged graph, without LLM labeling.

## 1.0.0

Refresh existing code graphs after edit and command tools, using Graphify's incremental
update and locking. Keep repositories without graphs untouched and report update failures.

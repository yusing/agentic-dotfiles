# Changelog

## 1.0.0

Generate a compact navigation report directly from Graphify JSON, without changing
Graphify or rewriting its Markdown. Separate production and test-file leads and god
nodes, preserve full-graph degree and connections, and publish reports atomically.

Run `graphify-report [PROJECT_ROOT]` after graph updates, including unchanged graphs.

Run `graphify-report --update [PROJECT_ROOT]` to exclude nested linked worktrees,
submodules and Cargo `workspace.exclude` packages before extraction using Graphify's
generated build metadata. Source ignore files stay unchanged; native/manual build
settings are preserved. Workspace defaults do not exclude non-default members.
Changed scope triggers a full native rebuild so newly excluded sources are removed;
unchanged scope retains native incremental updates.
Report-only runs apply current scope without modifying the graph. Reports are local
to each worktree or submodule, with production/test connections retained within it.

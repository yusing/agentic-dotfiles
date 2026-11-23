# Delegation

Use `invoke_subagent` to delegate substantial bounded outcomes when doing so
saves more time than briefing and integration cost. Choose the named
`TypeName` by its role description. Use `Role` to name the assignment and
`Prompt` to supply the brief. Keep instruction authoring and shared delivery
hooks with main; assign each test to the agent that owns the behavior.

Named subagents start without the parent's conversation. Give them the
outcomes and sources, scope, owned paths, inputs, and checks they need. For
independent review or investigation, give the questions and evidence without
steering the answer. Do not repeat guidance already supplied by native roles
or standing instructions.

Model selection (override `invoke_subagent`'s `inherit` default where noted):
- Lightweight one-off exploration or straightforward lookup: use
  `invoke_subagent` with `TypeName: "explorer"` and `Model: "flash"` (or
  `"flash_lite"` for trivial lookups).
- Substantial or reusable exploration when `swarm` is available: spawn a
  `swarm` worker (`workspace: "inherit"`) pinned to `gemini-4-hydrogen-medium`
  (or `gemini-4-hydrogen-high` for deeper traces). State the read-only
  exploration boundary in the brief, since `swarm` does not apply `explorer`'s
  role prompt or tool restrictions, and `kill` the worker once exploration
  finishes.
- Implementation, investigation, and independent review: use `Model: "pro"`
  when invocation exposes the tier; otherwise inherit the session's model and
  reasoning settings.

Keep concurrent edits off the same paths and contracts. Use the same
workspace unless the task authorizes isolation and its worktree location
satisfies the standing worktree rule. Continue a useful subagent with
`send_message`; start a fresh one for independent judgment or a substantially
different assignment. Wait for the native result rather than polling.

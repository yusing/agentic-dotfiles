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

Use Flash for bounded lookup or straightforward work and Pro for
implementation, investigation, and independent review when invocation exposes
the tier. Otherwise inherit the session's model and reasoning settings.

Keep concurrent edits off the same paths and contracts. Use the same
workspace unless the task authorizes isolation and its worktree location
satisfies the standing worktree rule. Continue a useful subagent with
`send_message`; start a fresh one for independent judgment or a substantially
different assignment. Wait for the native result rather than polling.

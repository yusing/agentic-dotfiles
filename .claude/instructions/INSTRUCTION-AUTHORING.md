# Instruction authoring

Check the instructions that actually take effect at each consumer, not just the files you edited.

## Design

State the intended outcome, scope, constraints, and checkable completion criteria. Keep
authorization and unresolved user decisions explicit. Standards constrain requested work; they must
not turn neighboring concerns into added product requirements or automatic approval gates.

Prefer stable outcomes over recipes the model can work out itself. Prescribe mechanics only for
unfamiliar tools, domain constraints, or local integration. Keep non-obvious facts, reasons, and
gotchas; leave discoverable commands, layout, and configuration with their owners.

Give each rule one owner: base communication and safety, shared authorization, main orchestration,
delegate delivery, agent role methods, project facts, or skill-specific methods. Link instead of
copying. Put universally needed context inline and conditional detail behind a precise operation
trigger. Do not add a layer that only moves the same complexity elsewhere.

Shared rules preserve roles and settled assignments. Workflows own delegation and readiness gates;
agent definitions own tools, model, and effort. Check documentation and mechanical work too.
Preserve client-specific dispatch for fields a role configuration omits.

## Writing for Claude

These follow Anthropic's guidance for current models. Where the Claude Opus 5.5 or Opus 5 pages
differ from the general guide, they take precedence. Each bullet links the section it rests on.

- State the desired behavior and its scope explicitly. Ask outright for "above and beyond" work
  rather than expecting it to be inferred ([clear and direct][bp-direct]). For narrow tasks, bound
  the scope, because Opus 5 can expand a task with unrequested steps ([task scope][o5-scope]).
  The Opus 5.5 page keeps the Opus 5 patterns as a reasonable starting point.
- Explain the reason behind a non-obvious rule in a clause; Claude generalizes from the explanation
  to cases the rule did not name ([add context][bp-context]).
- Say what to do rather than what to avoid ([format control][bp-format]), and name the actor. For
  progress updates, positive examples of the wanted communication style steer better than
  prohibitions ([progress updates][o5-updates]). Keep a prohibition only for a distinct boundary
  with no useful positive form. One model-specific exception: Opus 5.5 responds well to frontend
  instructions that name specific patterns to avoid ([frontend defaults][o55-frontend]).
- Use plain wording such as "Use this tool when..." in place of "CRITICAL: You MUST...". Anthropic
  notes that Opus 4.5 and 4.6 may overtrigger on aggressive emphasis ([tool usage][bp-tools]).
  Strengthen wording only for a rule observed being ignored; Anthropic shows stronger wording as one
  option after such an observation ([iterating on skills][sk-iterate]).
- Leave out generic re-check or double-check steps and verification subagents beyond the review
  policy in `REVIEW.md`: Opus 5 verifies and corrects its own work unprompted, so such instructions
  add cost without improving results ([over-verification][o5-scope],
  [self-correction][o5-selfcorr]).
- Control thinking depth with effort rather than prompt wording ([calibrate effort][o55-effort]); in
  chat prompts, Anthropic found removing "think carefully" lines made replies start sooner with no
  clear quality loss ([chat thinking][o55-chat]).
- Give delegation explicit bounds: Opus 5 spawns subagents readily, which multiplies cost
  on small tasks ([subagent spawning][o5-subagents]).
- When examples steer format or tone, make them relevant, varied enough that incidental details are
  not copied, and wrapped in `<example>` tags; Anthropic suggests three to five
  ([examples][bp-examples]). Add an example only when it carries a needed distinction.
- Match the prompt's formatting to the output you want, since prompt style carries into responses
  ([format control][bp-format]).
- In model-facing templates, wrap each kind of content (instructions, context, input) in its own
  descriptive XML tag ([XML tags][bp-xml]).
- State expected length for written deliverables, which Opus 5 makes longer by default
  ([deliverable length][o5-length]).
- Delete generic coaching, no-op assurances, repeated caveats, and restatements of the harness's own
  system prompt. Shorter wording must not erase supported capabilities.

Claude Code loads `~/.claude/CLAUDE.md` and the `CLAUDE.md` files in the working directory and every
directory above it at launch ([how CLAUDE.md files load][cc-load]), expands their `@` imports at
launch too ([imports][cc-imports]), and loads `.claude/rules/*.md` at launch unless `paths`
frontmatter scopes a rule to matching files ([rules][cc-rules-setup], [path-specific
rules][cc-rules]). Anthropic recommends keeping each `CLAUDE.md` under 200 lines, since longer files
reduce adherence ([effective instructions][cc-size]). Point to conditional documents by path, as
`CLAUDE.md` does for `~/.claude/instructions/`.

[bp-direct]: https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices#be-clear-and-direct
[bp-context]: https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices#add-context-to-improve-performance
[bp-examples]: https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices#use-examples-effectively
[bp-xml]: https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices#structure-prompts-with-xml-tags
[bp-format]: https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices#control-the-format-of-responses
[bp-tools]: https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices#tool-usage
[o5-scope]: https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/prompting-claude-opus-5#task-scope-and-over-verification
[o5-updates]: https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/prompting-claude-opus-5#user-facing-progress-updates
[o5-selfcorr]: https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/prompting-claude-opus-5#self-correction
[o5-subagents]: https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/prompting-claude-opus-5#controlling-subagent-spawning
[o5-length]: https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/prompting-claude-opus-5#written-deliverable-length
[o55-effort]: https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/prompting-claude-opus-5-5#calibrate-effort
[o55-chat]: https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/prompting-claude-opus-5-5#thinking-instructions-in-chat-system-prompts
[o55-frontend]: https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/prompting-claude-opus-5-5#frontend-design-defaults
[sk-iterate]: https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices#develop-skills-iteratively-with-claude
[cc-load]: https://code.claude.com/docs/en/memory#how-claude-md-files-load
[cc-imports]: https://code.claude.com/docs/en/memory#import-additional-files
[cc-rules-setup]: https://code.claude.com/docs/en/memory#set-up-rules
[cc-rules]: https://code.claude.com/docs/en/memory#path-specific-rules
[cc-size]: https://code.claude.com/docs/en/memory#write-effective-instructions

## Consumer checks

Trace affected main and subagent paths, applicable instructions, pointers, and generated consumers.
For renames, align paths, references, metadata, selection, tests, and allowlists, and keep
historical names in records. Regenerate from authoritative sources. Check actual inheritance,
fresh-context assembly, and client capabilities before assuming isolation or redundancy; for
example, named Claude subagents start without conversation history, and all but the built-in Explore
and Plan load `CLAUDE.md` but not Claude Code's system prompt ([what loads at
startup][cc-subagents]). A rule dropped from `CLAUDE.md` as a duplicate of that system prompt
therefore stops reaching subagents; keep it when they need it.

Evaluate both matching and adjacent nonmatching cases. Check that each required step changes
behavior, serves the task, and causes no redundant reads, tests, permission prompts, or broader
scope. Remove a stale rule at its owner rather than appending another correction beside it.

Keep structural and drift checks separate from behavioral conclusions. Source inspection cannot
prove live reload or better model outcomes. Treat a rationale as a claim, not an approval checklist;
observed behavior settles disputes about defaults. Report concrete coverage gaps and remaining
limitations.

[cc-subagents]: https://code.claude.com/docs/en/sub-agents#what-loads-at-startup

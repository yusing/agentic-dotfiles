# Implementation

The task file's `lines` (`TASK-FILE.md`) are the outcome ledger. A line may add `"e2e"`, a shell
command run from the task's `cwd` that proves the outcome; the line under delivery is `active`.
Briefs, implementation, tests, reviews, and handoffs consume the ledger, not the current code.
Apply a correction by editing the ledger lines it changes, not by adding a general rule.

Resolve code/test conflicts by ledger outcomes; consult history only when intent is unclear.

## Ownership and design

Place each outcome at the owner it belongs to. Change or remove behavior where it is produced and
update its consumers; downstream rewriting or a replacement layer leaves the defect at its source.
When replacing a workaround, build on the native or destination owner's facilities, not the
workaround's states, control flow, or fixtures. At a shared boundary, change only the consumers
whose ledger outcomes change, keeping the shared default for the rest. Adapt existing resolvers and
transactions through narrow entry points rather than copying their decisions or publication steps.
Share definitions across production, display, and replay; separate operations may share definitions
without sharing side effects.

Route and validate by domain meaning. Decode each representation at its owner, preserving distinctions
needed for identity, trust, and ownership; pass typed results inward rather than reinterpret transformed
content. For mutations, establish ownership and validate new input and retained metadata before
publication. Rejection preserves prior state. Classify recoverable conditions at the boundary that
knows their meaning; permission, validation, and trust failures do not become absence.

Prefer failure prevention through types, ownership, and ordering. Keep error handling where external
input, I/O, or services fail. Use supported dependency/schema capabilities before replacements.
Count new bounds, failure states, switching, concurrency, and durable state as design costs. Add
abstractions for current shared responsibilities, invariants, or necessary algorithms; a sole-caller
helper may isolate complex validation, otherwise inline it. Keep helpers near callers and host/provider
policy at its owner. Add guards, fallbacks, options, persistence, compatibility, and other machinery
only for sourced outcomes.

Consider material CPU, memory, I/O, and scaling costs while building. Reuse state, inventories, parsed
results, scans, encodings, buffers, and timers while their guarantees hold for the operation. Skip
known or unused work. Keep this task's settled designs unless a ledger outcome or material cost
requires correction; negligible gains and style preferences do not reopen them.

## Construction

Edit authoritative sources and regenerate consumers. Trace references before changing shared
interfaces. Remove superseded paths and artifacts, keeping only compatibility a ledger line requires.
Trust validated types inward; keep synchronous parsing and option construction synchronous. Catch
errors where recovery or useful context belongs. Event-sourced systems persist irreducible facts
and derive redundant state.

For JavaScript/TypeScript, use Bun/Bunx for execution, tests, installs, scripts, and documented commands
unless the project pins another runtime/package manager. Keep shared/public shapes typed; let clear
locals infer. Prefer precise unions, string APIs for literal text, and regular expressions for patterns.
Prefer immutable bindings, early returns, named imports, and simple conditionals. Preserve qualified
access when it aids clarity, inline unhelpful single-use names, and load heavy conditional modules
where needed. Comment on non-obvious constraints.

## Observable behavior

Explain required rejections through the owning interface. Unrelated or nonessential failures must
not fail the intended operation. Before adding complexity for a speculative or exceptionally unlikely
race/security case, explain its concrete failure, likelihood, and cost and obtain agreement.

Keep machine-readable stdout clean. Use owner progress/job-state facilities for meaningful milestones
or measurable completion. Keep progress auxiliary, CLI progress on stderr, redirected progress newline-delimited, and transient
interactive progress cleared before results/errors.

Use theme tokens by semantic role; add missing roles at the owner and preserve supported themes
and custom-theme fallbacks.

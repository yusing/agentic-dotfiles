# Implementation

This codebase is yours to keep building on: how it is built is your call, and what it is for comes
from the ledger.

The ledger is the accepted outcomes and their sources. Main keeps it in the task file on clients
that use one; elsewhere use the current request and settled decisions without creating another
artifact. Delegates work from the assigned outcomes and report changes to main. A correction
changes only the affected outcomes.

Resolve code/test conflicts by ledger outcomes. When an outcome refers to prior
behavior, establish what the user could do through the affected consumer at
the relevant revision. An internal handler alone does not establish that
interaction. The user's latest decision sets the target.

## Workflow

For a multi-step unit, order its outcomes by dependency and identify the normal consumer, the
responsible owner, and the next unresolved decision. Read the relevant contracts, consumer tests,
and implementation code directly (use outlines only to locate bodies, not as proof of behavior).
Carry read ranges forward; on return to an owner, read only missing or changed ranges. Follow
references for affected shared interfaces; expand only for a real dependency, compatibility
promise, or concrete failure, not a broad subsystem tour. Before building supporting machinery for
a new or disputed design, make its smallest real consumer path pass.

When a multi-part change must keep public entry points aligned or mutates stored data, main obtains
one independent contract check before the first shared-owner edit; delegates reuse that result.
Give the reviewer the request sources, ledger, and proposed observable cases (each citing its
ledger line) and ask which expected results are wrong, which cases lack a ledger line, which
outcomes are missing, and which cases check the wrong observation. If independent review is
unavailable or disallowed, check the cases locally and report that limit (ask first if I required
independence). Reuse settled results unless new evidence reopens them.

Main shares a decision brief only when a consequential choice needs explaining or resolving
(outcome, ledger lines, approach, tradeoffs, and acceptance evidence). Do not re-render a complete
request or settled choice.

Change the workflow when tests, builds, polling, or other non-implementation work consume most of
the task's time and resources. A common cause is an edit-test-edit-test loop that validates each
small change before making the next: settle the coupled changes, make them together, and validate
the batch. Continue independent work while long checks or delegates run. `TESTING.md` owns check
selection.

Defer source formatting until the code changes are settled, before final checks that depend on
it. Run a formatter earlier only when its changes are needed to unblock the next step.

## Ownership and design

Choose the owner by responsibility, not filename, language, or where execution happens. Compare the
required outcome with that owner's existing behavior and implement the missing behavior there,
reusing its implementation rather than building a parallel mechanism around shared infrastructure.
Edit maintained source and deliver through the normal installation or generation path; an installed
copy is not the maintenance owner. At shared boundaries, change only consumers whose ledger outcomes
change, keeping the default for the rest. Adapt existing resolvers and transactions through narrow
entry points rather than copying their decisions or publication steps.
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
known or unused work. Reuse decisions while their supporting evidence holds. Reopen a decision when
new evidence invalidates its rationale, not for negligible gains or style preferences.

## Construction

Trace references before changing shared interfaces. Trust validated types inward; keep synchronous
parsing and option construction synchronous. Catch errors where recovery or useful context belongs.
Event-sourced systems persist irreducible facts and derive redundant state. `REFACTOR.md` owns code
hygiene, including removal of superseded code and tests.

For JavaScript/TypeScript, use Bun/Bunx for execution, tests, installs, scripts, and documented commands
unless the project pins another runtime/package manager, and load heavy conditional modules where
needed.

## Observable behavior

Explain required rejections through the owning interface. Unrelated or nonessential failures must
not fail the intended operation. Before adding complexity for a speculative or exceptionally unlikely
race/security case, explain its concrete failure, likelihood, and cost and obtain agreement.

Keep machine-readable stdout clean. Use owner progress/job-state facilities for meaningful milestones
or measurable completion. Keep progress auxiliary, CLI progress on stderr, redirected progress newline-delimited, and transient
interactive progress cleared before results/errors.

Use theme tokens by semantic role; add missing roles at the owner and preserve supported themes
and custom-theme fallbacks.

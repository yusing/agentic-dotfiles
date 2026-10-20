# Feature commits

A `feat` adds a capability that users, callers, or operators can reach. Name that capability in
the subject, not the components built to provide it.

Body paragraphs, in order:

1. Goal, action first: `Let <who> <do what>`, then the need it serves. Link the issue, request,
   or design document.
2. Approach, action first: the design decisions a maintainer needs to use, extend, or debug the
   feature, such as the entry point, defaults, configuration, and limits, plus a rejected
   alternative when the choice is not obvious. Leave out a file-by-file tour.
3. Scope: open with `Not included:` for what is deliberately excluded or deferred, with a pointer
   to any tracked follow-up.
4. Proof: open with `Verified by` and say how the feature was exercised end to end, such as the
   tests covering its main path or a manual run with its observed result.

Situations:

- Behind a flag or setting: name it, its default, and how to enable the feature.
- One slice of a larger feature: say what works after this commit and what does not yet, and
  link the tracking issue.
- Breaking change: add the `!` marker and a `BREAKING CHANGE:` trailer with the migration.

<example>
feat(export): add --since to limit exports by modification time

Let nightly exports fetch only records modified after a given time.
Exporting everything and discarding old records took most of an hour
on large workspaces.

Accept RFC 3339 timestamps and relative durations such as 24h, and
filter in the database query so skipped records are never loaded.

Not included: deleted records; tombstone export is tracked in #512.

Verified by the export integration tests, which cover both formats and
an empty result, and by exporting one day of changes from a
2-million-record workspace in 40 seconds.

Fixes #498
</example>

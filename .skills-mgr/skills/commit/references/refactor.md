# Refactor commits

A `refactor` changes structure without changing intended behavior. Name the structure the commit
creates in the subject, for example `refactor(auth): move token parsing into a tokens package`.

Body paragraphs, in order:

1. Motivation, cause first: `Because <old structure>, <what was hard, risky, or duplicated>`, or
   the upcoming change this enables (linked when it exists).
2. New structure, action first: the imperative verb of the move, where responsibilities now live,
   named so a reader can navigate to them, and the rule that keeps them there.
3. Behavior: open with `Verified unchanged by` and name the evidence, such as existing tests
   passing without edits. An intended observable difference belongs in a separate `fix` or
   `feat` commit.

Situations:

- Mechanical rename or move: one body line saying the change is mechanical and how it was
  produced, such as the rename tool or command, lets reviewers skim it.
- Large extraction across many files: give the governing idea and the main entry points; a
  subject alone cannot explain a change of that size.
- Enabling refactor for a following commit: say what the next change needs from this one.

<example>
refactor(billing): compute invoice totals in one place

Because the PDF renderer, the email summary, and the API each computed
invoice totals, tax-exemption support (#230) would need the same
change three times.

Move the calculation into billing.Totals, which all three outputs now
call. Preserve the existing rounding rules in every output.

Verified unchanged by the invoice tests, which pass without edits; the
multi-currency PDF, email, and API snapshots remain unchanged.
</example>

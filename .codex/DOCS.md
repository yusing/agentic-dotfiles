# Reader documentation

Keep affected documents true and usable for a reader without session history:

- README: what users need to understand, choose, or do, including limits and side effects.
- Spec: intent, scope, non-goals, journeys, and rationale.
- Contract: types, schemas, errors, SLAs, and compatibility.

Spec/contract must not overlap or restate code. Describe behavior at the level a reader decides or
relies on; leave internal guards, bounds, concurrency handling, and wire mechanics to code and tests
unless a reader must account for them. Write one current description, not appended task history or
comparisons with removed behavior. Remove descriptions of superseded approaches, implementations,
and decisions. Retain historical details only when readers need them for migration, supported
compatibility, or a current constraint.
Merge facts at their topic and keep each at the level whose reader needs it; other documents link
it rather than restate it. Remove superseded duplication and keep summaries, Features, indexes, and
navigation consistent without compressing away meaningful capabilities.

Use the settled intended contract, retained capabilities, limits, and source evidence, not the diff
alone. Specs and contracts define intended behavior; reader guidance must distinguish planned
capabilities from available ones where that affects use. Claims about validation and measured
behavior require evidence. Update the existing topic when implementation evidence changes a decision.
Read manageable affected documents completely before editing. For large documents, inspect the
full structure, affected topics, and cross-references. Reuse current reads and state coverage gaps
in the task record. Search mapped owners for conflicts; expand only for a dependency across that map.

Main owns applicability, behavior, owner discovery, integration, and the timing/authorship policy
in MAIN.md. Instructions, skills, workflow/task documents, and model-facing templates stay main's.

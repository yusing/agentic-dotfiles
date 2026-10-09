# Reader documentation

Keep affected documents true and usable for a reader who has none of this session's history:

- README: what users need to understand, choose, or do, including limits and side effects.
- Spec: intent, scope, non-goals, journeys, and rationale.
- Contract: types, schemas, errors, SLAs, and compatibility.

Specs and contracts neither overlap each other nor restate code. Describe behavior at the level a
reader decides on or relies on; leave internal guards, bounds, concurrency handling, and wire
mechanics to code and tests unless a reader must account for them. Match each document's length to
what its reader needs, without filler sections, redundant summaries, or boilerplate. Write one
current description rather than appended task history or comparisons with removed behavior, and
remove descriptions of superseded approaches, implementations, and decisions. Keep historical detail
only when readers need it for migration, supported compatibility, or a current constraint.

Merge each fact into its topic at the level whose reader needs it; other documents link to it
instead of restating it. Remove superseded duplication, and keep summaries, Features sections,
indexes, and navigation consistent without compressing away meaningful capabilities.

Write from the settled intended contract, retained capabilities, limits, and source evidence, not
from the diff alone. Specs and contracts define intended behavior; reader guidance distinguishes
planned capabilities from available ones where that affects use. Claims about validation and
measured behavior require evidence. When implementation evidence changes a decision, update the
existing topic.

Read manageable affected documents completely before editing. For large documents, inspect the full
structure, the affected topics, and their cross-references. Reuse current reads and record coverage
gaps in the task record. Search mapped owners for conflicts, expanding only for a dependency across
that map.

The main agent owns applicability, behavior, owner discovery, integration, and the timing and
authorship policy in `MAIN.md`. Instructions, skills, workflow and task documents, and model-facing
templates stay with the main agent.

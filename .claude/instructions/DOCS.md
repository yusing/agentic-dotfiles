# Reader documentation

Keep affected documents true and usable for their readers:

- README: what users need to understand, choose, or do, including limits and side effects.
- Spec: intent, scope, non-goals, journeys, and rationale.
- Contract: types, schemas, errors, SLAs, and compatibility.

Keep specs/contracts distinct from one another and code. Describe behavior readers decide on or
rely on; leave internal mechanics to code/tests unless readers must account for them. Match detail
to the audience, without filler or boilerplate. Integrate each fact into its owning topic and link
from other documents. Keep navigation, summaries, and capability lists consistent.

Describe the settled contract, retained capabilities, limits, and source evidence, not merely the
diff. Distinguish required outcomes established by accepted requirements/specifications from current
replaceable design and capabilities of unknown origin. Distinguish planned from available behavior
where readers need it. Claims about validation or measured behavior need evidence.

Replace superseded descriptions rather than append task history; retain history only for migration,
supported compatibility, or current constraints. When evidence changes a decision, update its topic.

Read affected topics and cross-references; inspect the full structure for rewrites or structural
changes. Expand only for dependent facts needed to keep the description coherent, and record coverage
gaps in the existing task record.

Main owns applicability and integration. `DELEGATION.md` owns authorship policy; instructions, skills,
workflows/task documents, and model-facing templates remain with main.

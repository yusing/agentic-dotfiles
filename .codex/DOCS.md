# Reader documentation

Keep affected documents true and usable for their readers:

- README: what users need to understand, choose, or do, including limits and side effects.
- Spec: intent, scope, non-goals, journeys, and rationale.
- Contract: types, schemas, errors, SLAs, and compatibility.

Keep specs/contracts distinct from one another and code. Describe behavior readers decide on or
rely on; leave internal mechanics to code/tests unless readers must account for them. Match detail
to the reader's next decision or action, and assess the complete output against that purpose. A
navigation overview helps readers choose where to look; exhaustive inventory belongs in linked or
queryable detail. Integrate each fact into its
owning topic and link from other documents. Keep navigation, summaries, and capability lists consistent.

Update documents when the change alters what their readers must understand, decide, or rely on.
Implementation changes alone do not require prose changes. Describe the resulting contract, not the
mechanism chosen or removed. Keep migration history only while readers need it, and do not promote
current implementation behavior into a requirement. Distinguish planned from available behavior
where readers need it. Claims about validation or measured behavior need evidence.

Replace superseded descriptions rather than append task history. When evidence changes a decision,
update its topic.

Read affected topics and cross-references; inspect the full structure for rewrites or structural
changes. Expand only for dependent facts needed to keep the description coherent, and record coverage
gaps in the existing task record.

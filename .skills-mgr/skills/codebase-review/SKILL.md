---
name: codebase-review
description: Review the entire current working tree for evidence-backed issues, not just a diff.
disable-model-invocation: true
---

# Whole-Codebase Review

Review the entire current working tree, including local changes. Read files directly; do not use
Git objects, diffs, history, or blame to choose scope or inspect content. Keep files and Git state
read-only.

## Coverage and evidence

Map every behavior-owning surface and trace important end-to-end flows: entry points, public
interfaces, core logic, adapters, storage, configuration, integrations, background work, trust
boundaries, and errors. Read implementations and relevant tests, not search snippets. Consult
requirements, architecture, manifests, and documentation where they establish intended behavior.
Exclude generated, vendored, and third-party code from primary review unless the project owns or
executes behavior that needs inspection.

Report correctness, security, reliability, performance, maintainability, or coverage issues only
with concrete evidence and a reachable failure mode. Check duplicate implementations and active
references before proposing removal or a new source of truth. Exclude style preferences,
untriggered hypotheticals, and issues already prevented by an authoritative boundary.

Use read-only checks when they materially establish a finding, not to fill a report. Keep source,
tests, configuration, dependencies, generated files, and Git state unchanged.

## Result

Lead with findings ordered Critical, High, Medium, Low. Each needs a title, `path:line`, impact,
concrete evidence, and smallest viable correction. If none qualify, say `No findings.`

Then report reviewed areas and tests, exact checks and outcomes (or why none ran), blind spots,
and a ship/block/follow-up recommendation. Finish when the whole requested surface is accounted
for as inspected or explicitly unvalidated, not merely when the first issue is found.

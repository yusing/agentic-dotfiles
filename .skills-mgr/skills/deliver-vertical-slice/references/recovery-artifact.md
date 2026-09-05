# <Accepted change>

Status: `<current slice or final-review phase>`.

Base revision: `<base commit>`.

Current head: `<head commit or working-tree basis>`.

This is the complete temporary recovery artifact for the automated change. Record every accepted item and material decision in full, even when an authoritative artifact also owns it; refresh this transient copy after every correction. Keep it outside commits and preserve it through all slices, final-review fixups, and autosquash. Delete it only after final review passes and the autosquashed range is validated.

## Preflight

- Accepted operation: `<new project | feature | behavioral change>`.
- Authorized repository writes: `<scope>`.
- Native inspections and follow-ups: `<scope and any task-specific constraints>`.
- Authorized commits, fixups, and autosquash: `<scope>`.
- Authorized external or destructive effects: `<scope or none>`.
- Required native review roles: `<reviewer; simplify-checker when needed; web-reviewer for frontend coverage>`.
- Review capability check: `<required roles available, or exact blocker>`.

## Accepted outcome

<Complete requested outcome and observable behavior.>

The delivered behavior must include `ALL` accepted items:

1. `<ITEM-ID>` — <complete behavior and acceptance>;
2. `<ITEM-ID>` — <complete behavior and acceptance>.

## Established facts and contracts

### <Area or boundary>

- <exact current and accepted behavior, supporting evidence, and a reproducer when fixing a bug>;
- <immediate failure mechanism when applicable>;
- <violated invariant and authoritative owner when applicable>;
- <required ownership, dependency, interface, lifecycle, trust, and failure rules>;
- <relevant paths, identifiers, revisions, or commands>.

## Ownership and complexity decisions

- `N` — another project, caller, provider, or runtime owns the policy.
- `O` — implementation complexity or maintenance cost exceeds what the accepted requirement needs.
- `D` — an authoritative owner already enforces the policy.
- `I` — accepted inputs cannot reach the proposed branch.
- `U` — ownership, an accepted requirement, or evidence needed for the implementation remains uncertain.
- `J` — a necessary locally owned responsibility, resource, or invariant justifies the implementation.
- `<ITEM-ID or proposal>`: `<N|O|D|I|U|J>` — <decision, owner, evidence, and owned responsibility for J>.

Apply the gate to implementation choices, preserving every accepted capability. Resolve `U`
before implementation; use authoritative owners for `N` and remove unnecessary `O`, `D`, or `I`
mechanisms. Record the justified local responsibility as `J`.

## Slice order

### `<S1-NAME>`

Items: `<ITEM-ID, ...>`.

Complete end-to-end behavior: <entry point through observable result>.

Expected owners and files:

- `<path or subsystem>`;
- `<path or subsystem>`.

Validation:

- [ ] <focused acceptance check>;
- [ ] <relevant regression or integration check>;
- [ ] <normal build or typecheck>;
- [ ] <real entry-point exercise>;
- [ ] <required pre-commit inspections>.

Commit: `<commit hash when complete>`.

### `<S2-NAME>`

<Repeat the complete slice definition for every remaining accepted item.>

## Item progress

- [ ] `<ITEM-ID>`
  - Slice: `<slice ID>`.
  - Evidence: <checks, inspection, and commit>.
  - Caveat: <known unrelated failure or remaining evidence gap>.
- [ ] `<ITEM-ID>`

## Final review and fixups

Inspection scope: `<base>..<head>`.

Skipped findings:

- `<inspection type and position>` — <short disposition>.

Confirmed blockers in original slice order:

- [ ] `<slice ID>` / `<target commit>` — <blocker and evidence>.
  - Fixup: `<fixup commit>`.
  - Validation: <checks and pre-commit inspections>.

Autosquash:

- [ ] Required native reviews completed and all confirmed blockers cleared.
- [ ] Fixup commits autosquashed into corresponding slice commits.
- [ ] Rewritten base-to-head range validated without tree change.
- [ ] Final result reported with exact commit range.
- [ ] Temporary recovery artifact deleted.

## Explicit non-goals

- <behavior or boundary that must not change>;
- <unauthorized external, destructive, or paid operation>;
- <finding category that would broaden the accepted change>.

## Resume point

Current phase and skill: `<phase>` / `<phase-specific skill>`.

Next unchecked item, slice, blocker, or checkpoint: `<exact identifier>`.

Current work:

- <changed files and purpose>;
- <running process or inspection that must remain untouched>;
- <latest validation and terminal inspection results>;
- <untracked paths that must remain outside commits>.

---
name: codebase-review
description: Review the entire current working tree, including local changes. Use when asked for a whole-codebase review, architecture review, or audit that must inspect all behavior-owning source rather than a diff, changed files, or a selected patch.
disable-model-invocation: true
---

# Whole-Codebase Review

Review the entire current working tree, including local changes. Inspect files directly. Do not use Git-object inspection such as `git show`, `git diff`, a diff base, commit history, changed files, or blame to choose scope or inspect content. Do not modify files, stage changes, create commits, or make other Git writes.

## Establish scope

1. Read the repository guidance, top-level documentation, architecture/specification documents, build manifests, and configuration that define intended behavior.
2. Map every behavior-owning source surface: entry points, commands, public APIs, core packages, adapters, persistence, configuration, integrations, concurrency/background work, security boundaries, and error handling. Exclude generated, vendored, and third-party code from primary review unless the project owns or executes its behavior in a way that needs validation.
3. Read relevant tests alongside each surface. Use tests as evidence of intended behavior and identify important paths they do not cover.
4. Trace important end-to-end flows across module boundaries. Read implementations, not search snippets.

## Evaluate findings

Find correctness, security, reliability, performance, maintainability, and test-gap issues. A finding requires concrete evidence from the code, specification, or a read-only check. Explain the reachable failure mode; do not report style preferences, hypothetical concerns without a trigger, or an issue already prevented elsewhere.

Use read-only project checks only when they materially validate a finding. Do not run checks solely to make the report look complete. Never change source, tests, configuration, dependencies, generated files, or Git state.

For removals or source-of-truth concerns, search the affected behavior for duplicate implementations and stale references before reporting.

## Report

State findings first, ordered by severity: Critical, High, Medium, Low. For each finding, include:

- `Severity — title`
- `path:line`
- impact and affected behavior
- concrete evidence, including control flow or a check result when used
- smallest viable fix

Follow findings with:

- **Reviewed scope:** behavior-owning areas, architecture/spec/docs, and tests inspected.
- **Checks run:** exact read-only checks and results, or `None` with reason.
- **Remaining blind spots:** areas not fully validated and why.
- **Recommendation:** ship/block/follow-up priority.

If no evidence-backed issues exist, say `No findings.` explicitly, then provide the same scope, checks, blind spots, and recommendation sections.

# Refactoring and code hygiene

Apply this to code you write, restructure, or remove. `TESTING.md` owns coverage and validation.

## Removal

Remove superseded paths and artifacts, along with the helpers, options, branches, configuration,
fixtures, and documents that served only them. Keep only compatibility a ledger line requires, and
collapse switching left with a single case.

After removing a feature or behavior, delete the tests whose subject was the removed behavior rather
than renaming or rewriting them to assert what remains. A rewritten test keeps the removed concept's
framing and duplicates or misstates coverage of the surviving path. Edit a test only when its
subject survives and the removal changes a value it asserts. If a ledger outcome for the surviving
behavior then lacks coverage, add a test for it on its own terms.

<example>
After support for multiple backends is removed, `TestFeatureBackendSpecific` checks
that recovery guidance differs per backend. Renaming it to `TestFeatureUseThisBackend`
and rewriting its body is the wrong change; delete it, because backend-specific feature no longer
exists.
</example>

## Style

For JavaScript/TypeScript, keep shared/public shapes typed and let clear locals infer. Prefer precise
unions, string APIs for literal text, and regular expressions for patterns. Prefer immutable
bindings, early returns, named imports, and simple conditionals. Preserve qualified access when it
aids clarity, inline unhelpful single-use names, and comment on non-obvious constraints.

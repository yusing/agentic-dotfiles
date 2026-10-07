# Library, SDK, framework, or plugin README guide

## Reader and promise

Write for a developer deciding whether the package fits a concrete integration and
then trying to make the smallest useful call. The opening should name the problem,
the public interface, and the supported ecosystem.
For a framework or plugin, the first example should show its place in a working
host application, including registration or lifecycle steps the caller needs.

## Default path

1. Package name and concrete capability
2. Installation with package-manager coordinates
3. Minimal working example and expected result
4. Common integration patterns
5. Configuration and error behavior
6. Public API or link to the full reference
7. Compatibility, stability, and versioning
8. Development, contribution, and license

## Evidence to gather

Inspect exported symbols, package metadata, supported runtime versions, examples,
tests at the public boundary, generated API documentation, and release policy. Use
third-party documentation for dependency contracts rather than inferring them from
call sites.

## Fit checks

Keep the first example copyable and complete. Separate stable public API from
internal helpers, state important ownership and lifecycle rules, and avoid turning
the README into a duplicate API reference.

## Observed example

[Zod](https://github.com/colinhacks/zod/blob/main/packages/zod/README.md) introduces
the library with a small schema and typed result, then gives installation and
basic usage with concrete input, parsing, and error handling. It links the full
API and specialized features to its documentation site. Borrow the small,
complete integration example; an importable API is not an onboarding model for
an interactive application.

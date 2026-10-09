# Infrastructure, server, or service platform README guide

## Reader and promise

Write for an operator or development team deciding whether to deploy or connect to
the service. State the service's role, supported deployment model, and the useful
result it enables. Distinguish hosted use, local development, and self-hosted
operation when the project actually supports those paths.

## Possible reader path

1. Service purpose and capabilities, with links to their guides
2. Architecture or dashboard image when it clarifies the service boundary
3. A clear choice of hosted, local, or self-hosted use
4. Prerequisites and the shortest supported path to a working service
5. A connection, request, or health check with an expected result
6. Configuration, credentials, network exposure, and durable data
7. Operations, upgrades, backup, and recovery guidance where applicable
8. Client integration, support, and contributor documentation

## Evidence to gather

For affected claims, inspect deployment definitions, runtime requirements,
configuration, public endpoints, persistence, authentication, and operations
documentation. Verify which path is production-supported rather than a local demo.

## Fit checks

Put operational assumptions beside setup, including exposed ports, credentials,
and data persistence that affect the reader's decision. Link maintained deployment
and operation guides rather than duplicate them. Component architecture is useful
when it explains deployment or integration choices, not as an internal inventory.

## Observed example

[Supabase](https://github.com/supabase/supabase#readme) links each capability to its
service documentation, shows the dashboard, and routes readers to hosted,
self-hosted, and local-development paths. Borrow the capability map and explicit
deployment choices. Its multi-service architecture and client-language matrix are
specific to its platform. Make the chosen first-use path easy to find rather than
copying its later placement beneath the architecture explanation.

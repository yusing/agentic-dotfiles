# End-user application README guide

## Reader and promise

Write for someone deciding whether to use the application and then trying to reach
its first useful result in a desktop, web, or mobile interface. The opening should
make the product outcome, delivery model, and intended environment clear. Use the
[infrastructure guide](infrastructure.md) for service operation and the
[developer-tool guide](developer-tool.md) when the primary experience is an editor,
TUI workbench, or coding-agent frontend.

## Default path

1. Title and one-sentence user outcome
2. Screenshot, demo, or representative output when it shortens evaluation
3. Quick start from prerequisites to a working application
4. Everyday workflows with expected results
5. Configuration, accounts, data, and integrations
6. Deployment or operations when readers own them
7. Architecture and development setup for contributors
8. Support, contribution path, and license when applicable

## Evidence to gather

Inspect entrypoints, routes or screens, runtime configuration, deployment files,
example environments, user-facing specifications, and development commands. State
where data is stored, which services are contacted, and what defaults take effect.

## Fit checks

Keep product evaluation and first use ahead of architecture. Describe deployment
only when the repository supports it, and distinguish a runnable application from
a reference implementation, demo, or work in progress.

## Observed example

[Immich](https://github.com/immich-app/immich#readme) opens with a product screenshot,
places its backup warning before adoption links, offers a demo, and compares
mobile and web capabilities. Installation lives in dedicated documentation.
Borrow the visible product outcome and clear evaluation path. A demo, platform
matrix, or external installation guide fits only when the project provides it.

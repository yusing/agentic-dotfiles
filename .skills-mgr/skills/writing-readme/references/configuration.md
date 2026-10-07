# Dotfiles, setup, or reusable configuration README guide

## Reader and promise

Write for someone interested in the setup who wants to understand it, use it as a
starting point, or adapt selected parts. The opening should identify the workflow,
its main tools, and the choices that make the setup distinctive.
Use the [starter guide](starter.md) when readers generate a new application from a
template; this guide serves adoption of an existing configuration or personal setup.

## Default path

1. Setup identity and working philosophy
2. Highlights that help a visitor judge fit
3. A “where to start” map by tool, layer, or desired outcome
4. Adaptation paths for the major parts of the setup
5. Prerequisites, assumptions, permissions, and machine-specific choices
6. Compact repository map
7. Installation only when an owned, tested installation workflow exists
8. License and contribution guidance when applicable

## Evidence to gather

Inspect the actual configuration entrypoints, shared includes, plugins, scripts,
supported platforms, expected tools, paths, environment variables, and permission
settings. Follow configuration ownership documents where filenames alone do not
explain the relationship.

## Fit checks

Help readers adopt one layer at a time. Distinguish a personal reference from a
portable installer, and give copying or merging guidance that matches the available
workflow. Keep the reader path focused on adoption; describe publishing, mirroring,
generation, or maintainer plumbing only when public contributors must use it.

## Observed example

[Mathias Bynens's dotfiles](https://github.com/mathiasbynens/dotfiles#readme) shows
the shell prompt, asks readers to review and remove unwanted settings before
installation, and explains private overrides separately from shared settings.
Borrow the review boundary and customization ownership. Its macOS-focused,
whole-home bootstrap commands are specific to that repository, not a portable
or selectively safe installation pattern.

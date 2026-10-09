# Command utility or automation README guide

## Reader and promise

Write for someone evaluating the command and then running it successfully. The
opening should name the input, operation, output, and important default behavior.
Use this guide when command invocation is the reader's main workflow. An editor,
interactive TUI, or coding-agent frontend needs the
[developer-tool guide](developer-tool.md) even if installation and launch use
shell commands.

## Default path

1. Command name and concrete outcome
2. Installation and prerequisites
3. First useful command with expected output
4. Everyday workflows
5. Inputs, outputs, important options, and configuration precedence
6. Exit status, failure behavior, and recovery
7. Automation or scripting examples
8. Development, contribution, and license

## Evidence to gather

For affected claims, inspect `--help`, argument parsing, configuration discovery,
stdout and stderr, exit codes, filesystem and network effects, authentication
sources, and generated completion or manpage references. Run representative
success and failure commands when safe. Use help or a command reference for
exhaustive inventories; keep options and examples needed for use in the README.

## Fit checks

Make examples shell-runnable and distinguish interactive from machine-readable
output. When a tool operates on behalf of an agent, workspace, or account, name
that scope in the example. Explain why a reader would choose a non-obvious option
and what changes when they use it; a table can compare supported choices after
their purpose is clear. Show option combinations when they change the outcome.

## Observed example

[ripgrep](https://github.com/BurntSushi/ripgrep#readme) states search defaults and
platform support immediately, links its guide and FAQ, and shows concrete search
commands. Its reasons to use or not use the tool help readers judge fit. Borrow
that specificity; its extensive benchmarks and installation matrix are justified
by its own product, not required for every command README.

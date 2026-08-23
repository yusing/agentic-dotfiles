# Command-line tool or automation README preset

## Reader and promise

Write for someone evaluating the command and then running it successfully. The
opening should name the input, operation, output, and important default behavior.

## Default path

1. Command name and concrete outcome
2. Installation and prerequisites
3. First useful command with expected output
4. Everyday workflows
5. Inputs, outputs, flags, and configuration precedence
6. Exit status, failure behavior, and recovery
7. Automation or scripting examples
8. Development, contribution, and license

## Evidence to gather

Inspect `--help`, argument parsing, configuration discovery, stdout and stderr,
exit codes, filesystem and network effects, authentication sources, and completion
or manpage generation. Run representative success and failure commands when safe.

## Fit checks

Place side effects before commands that trigger them. Use tables for comparison-
heavy flags or modes, keep examples shell-runnable, and distinguish interactive
output from machine-readable output.

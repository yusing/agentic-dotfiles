# Changelog

## 1.0.7

Use charAt for literal character comparisons that scriptc 0.2.6 rejects as
context-narrowed string indexing. Preserve comment and quote handling.
Split separator tokens explicitly instead of spreading strings.

## 1.0.6

Keep heredoc bodies visible when the command names a shell, `source`, `xargs`, or
another input executor, since it may run the body directly, through a pipe, or as a
written script.

## 1.0.5

Mask stdin only for literal quoted identifier delimiters with a proven terminator.
Preserve the previous scanner for complex headers and unquoted, unsupported, or
unmatched heredocs, so substitutions, locale quoting, and backslash-newline forms
cannot hide executable header or following commands.

## 1.0.4

Recognize ANSI-C quoted tokens and their escapes, and keep their contents inert during
command-substitution scanning, including nested substitutions. JavaScript template literals in Mekugi shell carriers are
not shell commands.

## 1.0.3

Share token-boundary comment recognition between tokenization and command-substitution
scanning. Ignore substitutions inside comments while preserving later real commands
and quoted or escaped hash characters.

## 1.0.2

Concatenate adjacent quoted and unquoted fragments, preserve empty quoted arguments, and skip comments at token boundaries.

## 1.0.1

Advance past an unterminated backtick instead of looping. `shellTokens`
accepts a punctuation set so braces can stay inside `${HOME}/...`.

## 1.0.0

Initial TypeScript release of shared shell tokenization helpers.

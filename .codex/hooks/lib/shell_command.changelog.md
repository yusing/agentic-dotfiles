# Changelog

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

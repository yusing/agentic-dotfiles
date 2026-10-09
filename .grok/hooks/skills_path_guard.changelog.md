# Changelog

## 1.1.2

Split separator tokens explicitly for scriptc 0.2.6's LLVM compiler.

## 1.1.1

Use shell scanner 1.0.6: search commands inside quoted heredoc data no longer count
unless the command also names a shell or another input executor.

## 1.1.0

Deny only search and listing of `/home/$USER/*/skills` and searches rooted
at `/home/$USER`. Agent-client directories are not broad search roots; a
missing dedicated-search path uses the event cwd. Relative roots and `cd`
targets resolve against that cwd. Shell search with no path argument is
not treated as a home-directory search, so `cmd | rg` still runs. Write
and edit tools are not matched. Only `toolInput.command` is tokenized.

## 1.0.1

Tokenize shell commands on `;&|()` so `${HOME}/...` stays one search root.

## 1.0.0

Initial scriptc-compiled TypeScript release of the Grok skills-path search guard.

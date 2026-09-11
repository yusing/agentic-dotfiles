# Changelog

## 1.0.1

Remove the retired Go-guidelines hook and its adapter build dependency.

## 1.0.0

Compile only helpers and hooks whose content, compiler, flags or target changed.
Track dependency installation separately and replace successful outputs atomically.
Include scriptc's linker selection in hook build identity.

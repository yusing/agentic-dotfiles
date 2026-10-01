# Changelog

## 1.0.0

Provide manifest-owned batch preparation and cleanup: shared-base Herdr worktrees,
temporary evidence copies and retained-image recovery, explicit project setup,
and non-forced removal of selected finished worktrees while preserving branches.
Remove owned temporary evidence after every batch finishes; retain the manifest,
unfinished work, and altered or unrecorded artifacts for recovery.
Support inspected-ready attestations for unknown agent states, reconcile lost removal
responses, and recover literal quoted paths from Codex image markers.

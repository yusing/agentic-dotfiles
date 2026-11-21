# Changelog

## 1.0.4

Allow verified non-dumpable Linux login/session daemons (`systemd --user`,
`(sd-pam)`, `ssh-agent`, `sshd`/`sshd-session`) and zombie processes during
same-user `/proc` inspection while continuing to read `cmdline` and refuse
unknown inaccessible processes. Recognize generated `mekugi-session-<uuid>`,
`task-run-*`, `codex-ab-*`, `opus-ab-*`, and Mekugi diagnostic temp prefixes
under the existing freshness, process-reference, mount, and repository guards.

## 1.0.3

Keep temporary cleanup standalone with the same protections for both `/tmp` and
`/var/tmp`. Use the neutral Linux inspection utilities shared with disk cleanup.

## 1.0.2

Include recognized generated performance and agent-tools fixtures in `/var/tmp`.
Refuse cleanup when same-user process inspection is incomplete instead of deleting
with partial reference evidence. Keep freshness, ownership, mount, and repository guards.
Support privileged process inspection under sudo while retaining the invoking
user's ownership boundary through validated SUDO_UID.
Reject mounted children, including same-filesystem bind mounts, using the shared
Linux mount-boundary guard also used by abandoned Rust-session cleanup.

## 1.0.1

Report the net change in free space on the temporary filesystem after cleanup, rather than summing file allocations.

## 1.0.0

Add Linux temporary-artifact cleanup with a two-hour freshness threshold, process-reference and repository exclusions, and a dry-run preview.

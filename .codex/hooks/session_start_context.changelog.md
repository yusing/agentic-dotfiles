# Changelog

## 1.1.1

Decode transcript envelopes with native fields while keeping payloads and
compaction-history entries opaque for their existing validation.

## 1.1.0

Suppress duplicate SubagentStart inventory only when matching hook context is proven
to remain in the child transcript. Preserve delivery for fresh, truncated, changed,
or unverifiable context and retain existing root startup and refresh behavior.
Bound transcript inspection to 256 KiB and preserve compaction replacement semantics.

## 1.0.0

Skip inherited context commands on fork startup using the transcript's initial
session metadata. Keep context refreshes after compaction and clearing, and run
normally when fork metadata is unavailable.

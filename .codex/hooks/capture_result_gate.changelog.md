# Changelog

## 1.2.0

Recognize capture handles in free text. Bound transcript row storage and scan
time; missing evidence does not block the handback.

## 1.1.0

Require a change reference only when the child transcript records a successful file change
in the stopping turn, even when later output displaces it. Missing evidence and no-change
results pass. A labelled or leading reference distinguishes handback IDs from ordinary prose.

## 1.0.0

Initial release of the SubagentStop gate that returns `default` and `worker`
results lacking a change capture ID (`amber2`), capture range
(`amber2..amber7`), or commit range to the subagent once.

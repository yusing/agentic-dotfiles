# Changelog

## 1.1.0

Report why the Taildrop wait ended instead of exiting 0, so a `tailscale file get`
failure (an unset `tailscale set --operator`, for one) shows up in the journal
rather than as a silent restart loop. Empty the drop directory each round instead
of only `clip.png`, so anything else Taildrop delivers cannot accumulate there.

## 1.0.0

Initial clip-recv helper: load each Taildrop clip.png into the X clipboard so agents running over mosh can paste it.

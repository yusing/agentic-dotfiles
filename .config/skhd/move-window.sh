#!/usr/bin/env sh
# Move the focused window one step in the given direction.
#
# An in-space move is preferred: --warp re-inserts the window in front of the
# neighbour rather than trading places with it, so A|B with B focused becomes
# B|A, and a neighbouring container is split instead of swapped wholesale.
#
# --warp exits non-zero when the window is already at the edge of the space, and
# also for a floating window, which sits outside the tree. Either way, fall back
# to sending the window to the display in that direction and following it.

set -u
dir=$1

yabai -m window --warp "$dir" 2>/dev/null && exit 0
yabai -m window --display "$dir" 2>/dev/null && exec yabai -m display --focus "$dir"

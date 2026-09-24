# Changelog

## 1.3.1

Describe the default target as the receiver's tailnet address rather than naming the host. The public projection redacts the address, so naming the machine it belongs to worked against that.

## 1.3.0

Keep the scratch PNG in a `clip-push` directory under `$XDG_RUNTIME_DIR` (or `$TMPDIR`) instead of a bare `mktemp` in /tmp, clean it up on HUP/INT/TERM as well as on exit, and sweep anything older than 10 minutes on each run. A push killed outside the traps (the 5-second watchdog, or `kill -9`) no longer leaves a temp file behind for every clipboard change.

## 1.2.0

Replace --paste with --changed. The macOS skhd Ctrl+V binding re-sent the key with `skhd -k`, which typed a bare `v`; clip-watch now pushes each copied image as the clipboard changes, and the paste keys are left alone. `--changed` exits quietly when the clipboard holds no image.

## 1.1.0

Add --target, which prints the target so setup.sh can recognize the receiver host.

## 1.0.0

Initial clip-push helper: send the clipboard image (macOS pngpaste, Wayland wl-paste, or X11 xclip) over Taildrop to clip-recv on the receiver host by default, or to $CLIP_PUSH_TARGET. With --paste, as run by the macOS skhd left-Ctrl+V binding, it always sends Ctrl+V afterwards as right Ctrl+V (so skhd does not catch it again), even with no image or a failed push. A push that takes longer than 5 seconds is abandoned.

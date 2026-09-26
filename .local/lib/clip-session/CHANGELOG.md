# Changelog

## 1.1.0

Bind each Ctrl+V to its input computer and pull over a fresh SSH connection. Deliver an immutable image reference through bracketed paste, which Codex turns into an image attachment. No X display, shared clipboard, persistent tunnel, or multiplexer integration is required. Keep Mosh and its application alive after paste-channel loss; subsequent pastes connect independently. Interrupt keys cancel pending pulls without blocking the terminal. Retain private temporary images for delayed application submission. Do not write clipboard progress over the application-owned terminal display.

## 1.0.0

Pull PNG clipboard images on demand over a session-owned SSH reverse socket.
SSH and mosh sessions get isolated authenticated X displays, including incremental
transfers for large images. No clipboard watcher, Taildrop receiver, or reverse SSH
credentials are needed.

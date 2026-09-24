# Changelog

## 1.0.0

Initial macOS pasteboard watcher: poll NSPasteboard.changeCount through the Objective-C runtime and run `clip-push --changed` on each change, one push at a time, so copied images reach clip-recv before the paste key.

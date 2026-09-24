// Run clip-push each time the macOS pasteboard changes, so an image copied on
// the Mac is already on the clip-recv host before Ctrl+V or Cmd+V reaches the
// remote agent. Polling NSPasteboard.changeCount reads no clipboard content.
import { dlopen, FFIType } from "bun:ffi";
import { spawn } from "node:child_process";
import { homedir } from "node:os";
import { join } from "node:path";

const VERSION = "1.0.0";
const POLL_MS = 250;

if (process.argv[2] === "--version") {
	console.log(VERSION);
	process.exit(0);
}
if (process.platform !== "darwin") {
	console.error("clip-watch: the pasteboard watcher runs on macOS only");
	process.exit(2);
}

const cstr = (text: string) => Buffer.from(`${text}\0`);
const objc = "/usr/lib/libobjc.A.dylib";

// NSPasteboard lives in AppKit; loading it registers the class with the runtime.
dlopen("/System/Library/Frameworks/AppKit.framework/AppKit", {
	NSApplicationLoad: { args: [], returns: FFIType.bool },
});
const { symbols: runtime } = dlopen(objc, {
	objc_getClass: { args: [FFIType.ptr], returns: FFIType.ptr },
	sel_registerName: { args: [FFIType.ptr], returns: FFIType.ptr },
	objc_msgSend: { args: [FFIType.ptr, FFIType.ptr], returns: FFIType.ptr },
});
// The same symbol with an NSInteger return, for -changeCount.
const { symbols: { objc_msgSend: sendInteger } } = dlopen(objc, {
	objc_msgSend: { args: [FFIType.ptr, FFIType.ptr], returns: FFIType.i64 },
});

const pasteboardClass = runtime.objc_getClass(cstr("NSPasteboard"));
const pasteboard = pasteboardClass
	&& runtime.objc_msgSend(pasteboardClass, runtime.sel_registerName(cstr("generalPasteboard")));
if (!pasteboard) {
	console.error("clip-watch: cannot open the general pasteboard");
	process.exit(1);
}
const changeCount = runtime.sel_registerName(cstr("changeCount"));

const clipPush = join(homedir(), ".local", "bin", "clip-push");
let lastCount = sendInteger(pasteboard, changeCount);
let pushing = false;
let changedWhilePushing = false;

// One push at a time; a change during a push sends the newest clipboard after it.
function push(): void {
	if (pushing) {
		changedWhilePushing = true;
		return;
	}
	pushing = true;
	const child = spawn(clipPush, ["--changed"], { stdio: ["ignore", "inherit", "inherit"] });
	const done = () => {
		pushing = false;
		if (changedWhilePushing) {
			changedWhilePushing = false;
			push();
		}
	};
	child.on("error", (error) => {
		console.error(`clip-watch: cannot run ${clipPush}: ${error.message}`);
		done();
	});
	child.on("exit", done);
}

setInterval(() => {
	const count = sendInteger(pasteboard, changeCount);
	if (count === lastCount) return;
	lastCount = count;
	push();
}, POLL_MS);

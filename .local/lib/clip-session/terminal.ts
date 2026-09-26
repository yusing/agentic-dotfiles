// Recognize image-paste keys without touching literal bracketed-paste text.
export class PasteInput {
  private pending = Buffer.alloc(0);
  private bracketed = false;
  flush(): Buffer { const data = this.pending; this.pending = Buffer.alloc(0); return data; }
  feed(data: Buffer): Array<Buffer | "paste"> {
    this.pending = Buffer.concat([this.pending, data]);
    const output: Array<Buffer | "paste"> = [];
    const start = Buffer.from("\x1b[200~"), end = Buffer.from("\x1b[201~");
    const pasteKeys = ["\x1b[118;5u", "\x1b[118;5:1u", "\x1b[118;5:2u", "\x1b[27;5;118~"].map(value => Buffer.from(value));
    while (this.pending.length) {
      const marker = this.bracketed ? end : start;
      const sequences = this.bracketed ? [marker] : [marker, ...pasteKeys];
      if (this.pending.length < 64 && /^\x1b\[[0-9;:]*$/.test(this.pending.toString("latin1"))) break;
      if (this.pending[0] === 27 && sequences.some(value => this.pending.length < value.length && value.subarray(0, this.pending.length).equals(this.pending))) break;
      if (this.pending.subarray(0, marker.length).equals(marker)) {
        this.bracketed = !this.bracketed; output.push(marker);
        this.pending = this.pending.subarray(marker.length); continue;
      }
      const key = !this.bracketed && pasteKeys.find(value => this.pending.subarray(0, value.length).equals(value));
      if (key) { output.push("paste"); this.pending = this.pending.subarray(key.length); continue; }
      let length = 1;
      if (!this.bracketed && this.pending[0] === 22) output.push("paste");
      else {
        while (length < this.pending.length && this.pending[length] !== 27 && (this.bracketed || this.pending[length] !== 22)) length++;
        output.push(this.pending.subarray(0, length));
      }
      this.pending = this.pending.subarray(length);
    }
    return output;
  }
}

export async function interactive(command: string[], paste: (signal: AbortSignal) => Promise<string | null>, signal: AbortSignal): Promise<number> {
  const child = Bun.spawn(command, {
    env: process.env,
    terminal: {
      cols: process.stdout.columns || 80, rows: process.stdout.rows || 24,
      data(_terminal, data) { process.stdout.write(data); },
    },
  });
  const terminal = child.terminal!;
  const input = new PasteInput();
  const queue: Array<Buffer | "paste"> = [];
  let active: AbortController | undefined;
  let draining = false;
  let stopped = false;
  let literal = false;
  let escapeTimer: ReturnType<typeof setTimeout>;
  const drain = async () => {
    if (draining) return;
    draining = true;
    try {
      while (queue.length && !stopped) {
        const item = queue.shift()!;
        if (item !== "paste") { terminal.write(item); continue; }
        const request = new AbortController();
        active = request;
        // The child owns the terminal grid. Status text written beside its TUI
        // cannot be erased safely without corrupting the application display.
        try {
          const path = await paste(request.signal);
          if (!request.signal.aborted && !stopped) {
            if (path === null) console.error("\r\nclip-session: source clipboard has no PNG image");
            else terminal.write(`\x1b[200~${path}\x1b[201~`);
          }
        } catch (error) {
          if (!request.signal.aborted && !stopped) console.error(`\r\nclip-session: ${error instanceof Error ? error.message : error}`);
        } finally { active = undefined; }
      }
    } finally { draining = false; }
  };
  const enqueue = (items: Array<Buffer | "paste">) => {
    for (const item of items) {
      if (Buffer.isBuffer(item)) {
        if (item.equals(Buffer.from("\x1b[200~"))) literal = true;
        // Control input bypasses the network wait and invalidates the pending
        // attachment, so cancellation cannot paste it later.
        if (!literal && /[\x03\x04\x1a\x1c\x1e]|\x1b\[(?:99|100|122|92|94);5(?::[12])?u|\x1b\[27;5;(?:99|100|122|92|94)~/.test(item.toString("latin1"))) {
          active?.abort();
          for (const pending of queue.splice(0)) if (Buffer.isBuffer(pending)) terminal.write(pending);
          terminal.write(item);
          continue;
        }
        if (item.equals(Buffer.from("\x1b[201~"))) literal = false;
      }
      queue.push(item);
    }
    void drain();
  };
  const receive = (data: Buffer) => {
    clearTimeout(escapeTimer);
    enqueue(input.feed(data));
    escapeTimer = setTimeout(() => enqueue([input.flush()]), 35);
  };
  const resize = () => terminal.resize(process.stdout.columns || 80, process.stdout.rows || 24);
  const cancel = () => { stopped = true; active?.abort(); child.kill(); };
  const wasRaw = process.stdin.isRaw;
  if (process.stdin.isTTY) process.stdin.setRawMode(true);
  process.stdin.on("data", receive);
  process.stdout.on("resize", resize);
  signal.addEventListener("abort", cancel, { once: true });
  if (signal.aborted) cancel();
  try { return await child.exited; }
  finally {
    stopped = true; active?.abort();
    clearTimeout(escapeTimer);
    process.stdin.off("data", receive); process.stdin.pause();
    process.stdout.off("resize", resize);
    signal.removeEventListener("abort", cancel);
    if (process.stdin.isTTY) process.stdin.setRawMode(!!wasRaw);
    terminal.close();
  }
}

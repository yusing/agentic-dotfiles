import x11 from "x11";
import { pullClipboard } from "./clipboard";

// X11 selection ownership is lazy: requesting image/png, not copying locally,
// performs the network read. Each session owns a separate X display.
export async function ownClipboard(display: string, socket: string) {
  const connection: any = await new Promise((resolve, reject) => {
    x11.createClient({ display }, (error: Error, result: any) => error ? reject(error) : resolve(result));
  });
  const X = connection.client;
  const atoms: Record<string, number> = {};
  for (const name of ["CLIPBOARD", "TARGETS", "image/png", "INCR", "ATOM"]) {
    atoms[name] = await new Promise((resolve, reject) => {
      X.InternAtom(false, name, (error: Error, atom: number) => error ? reject(error) : resolve(atom));
    });
  }
  const window = X.AllocID();
  X.CreateWindow(window, connection.screen[0].root, 0, 0, 1, 1, 0, 0, 1, 0, {});
  X.SetSelectionOwner(window, atoms.CLIPBOARD, 0);
  const transfers = new Map<string, { data: Buffer; offset: number; timer: ReturnType<typeof setTimeout> }>();
  const finish = (key: string) => {
    const transfer = transfers.get(key);
    if (transfer) clearTimeout(transfer.timer);
    transfers.delete(key);
  };
  // Below the minimum X11 maximum-request size. INCR handles large screenshots.
  const CHUNK = 60 * 1024;
  X.on("error", (error: Error) => console.error(`clip-session: X clipboard: ${error}`));
  X.on("event", async (event: any) => {
    if (event.name === "SelectionClear" && event.selection === atoms.CLIPBOARD) {
      // This display's clipboard is the origin, not a remote clipboard store.
      // A remote tool copying text/images must not permanently disconnect it.
      X.SetSelectionOwner(window, atoms.CLIPBOARD, 0);
      return;
    }
    if (event.name === "PropertyNotify" && event.state === 1) {
      const key = `${event.wid}:${event.atom}`;
      const transfer = transfers.get(key);
      if (!transfer) return;
      const chunk = transfer.data.subarray(transfer.offset, transfer.offset + CHUNK);
      X.ChangeProperty(0, event.wid, event.atom, atoms["image/png"], 8, chunk);
      transfer.offset += chunk.length;
      if (!chunk.length) finish(key);
      return;
    }
    if (event.name !== "SelectionRequest") return;
    let property = event.property || event.target;
    try {
      if (event.target === atoms.TARGETS) {
        X.ChangeProperty(0, event.requestor, property, atoms.ATOM, 32, [atoms.TARGETS, atoms["image/png"]]);
      } else if (event.target === atoms["image/png"]) {
        const data = await pullClipboard(socket);
        if (!data) property = 0;
        else if (data.length <= CHUNK) X.ChangeProperty(0, event.requestor, property, event.target, 8, data);
        else {
          const key = `${event.requestor}:${property}`;
          finish(key);
          X.ChangeWindowAttributes(event.requestor, { eventMask: x11.eventMask.PropertyChange });
          transfers.set(key, { data, offset: 0, timer: setTimeout(() => finish(key), 15000) });
          X.ChangeProperty(0, event.requestor, property, atoms.INCR, 32, [data.length]);
        }
      } else property = 0;
    } catch (error) {
      console.error(`clip-session: cannot pull image: ${error}`);
      property = 0;
    }
    X.SendEvent(event.requestor, false, 0, {
      name: "SelectionNotify", time: event.time, requestor: event.requestor,
      selection: event.selection, target: event.target, property,
    });
  });
  // Round trip ensures ownership exists before the application starts.
  await new Promise<void>((resolve, reject) => X.GetSelectionOwner(atoms.CLIPBOARD,
    (error: Error, owner: number) => error ? reject(error) : owner === window ? resolve() : reject(new Error("clipboard ownership failed"))));
  return () => {
    for (const key of transfers.keys()) finish(key);
    X.terminate();
  };
}

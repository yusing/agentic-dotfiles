export function intersectsMounts(target: string, path: string, mountInfo: string, includeTarget = true): boolean {
  return mountInfo.trim().split("\n").some(line => {
    const field = line.split(" ")[4];
    if (!field) throw new Error("Invalid Linux mount information; cleanup refused.");
    const mount = field.replace(/\\([0-7]{3})/g, (_, octal: string) => String.fromCharCode(parseInt(octal, 8)));
    return ((includeTarget && mount === target) || mount.startsWith(`${target}/`))
      && (mount === path || mount.startsWith(`${path}/`) || path.startsWith(`${mount}/`));
  });
}

import { openSync, closeSync, fstatSync, readSync, realpathSync, constants } from 'node:fs';
import { resolve, relative, isAbsolute, sep } from 'node:path';

const imageLimit = 5 * 1024 * 1024;
const documentLimit = 20 * 1024 * 1024;

// Bytes, not filenames, determine the embedded media type. SVG is intentionally excluded.
function mediaType(bytes) {
  if (bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) return 'image/png';
  if (bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255) return 'image/jpeg';
  if (bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP') return 'image/webp';
  throw new Error('expected PNG, JPEG, or WebP image bytes');
}

/** Load validated image blocks beneath an explicit directory; count every embedded occurrence. */
export function loadImages(document, inputDirectory) {
  const images = new Map();
  let total = 0;
  for (const [i, block] of document.blocks.entries()) {
    if (block.type !== 'image') continue;
    try {
      if (!inputDirectory) throw new Error('rendering images requires inputDirectory');
      const root = realpathSync(inputDirectory);
      const path = realpathSync(resolve(root, block.src));
      const within = relative(root, path);
      if (!within || within === '..' || within.startsWith(`..${sep}`) || isAbsolute(within)) throw new Error('image must stay inside the input directory');
      // Nonblocking open avoids hanging on special files; O_NOFOLLOW rejects a swapped symlink.
      const fd = openSync(path, constants.O_RDONLY | constants.O_NONBLOCK | constants.O_NOFOLLOW);
      try {
        const stat = fstatSync(fd);
        if (!stat.isFile()) throw new Error('image must be a regular file');
        if (stat.size > imageLimit) throw new Error('image exceeds the 5 MiB limit');
        const bytes = Buffer.alloc(imageLimit + 1);
        let size = 0, read;
        while (size < bytes.length && (read = readSync(fd, bytes, size, bytes.length - size, null)) > 0) size += read;
        if (size > imageLimit) throw new Error('image exceeds the 5 MiB limit');
        total += size;
        if (total > documentLimit) throw new Error('images exceed the 20 MiB document limit');
        const content = bytes.subarray(0, size);
        images.set(i, { src: `data:${mediaType(content)};base64,${content.toString('base64')}`, path, dev: stat.dev, ino: stat.ino });
      } finally { closeSync(fd); }
    } catch (error) { throw new Error(`$.blocks[${i}].src: ${error.message}`); }
  }
  return images;
}

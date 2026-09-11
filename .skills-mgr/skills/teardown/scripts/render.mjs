#!/usr/bin/env node
import { readFileSync, realpathSync, statSync, writeFileSync, renameSync, unlinkSync, openSync, closeSync } from 'node:fs';
import { resolve, dirname, basename } from 'node:path';
import { pathToFileURL } from 'node:url';
import { randomUUID } from 'node:crypto';
import { validate } from './validate.mjs';
import { render } from './html.mjs';
import { loadImages } from './images.mjs';
export { validate, render };

const usage = 'Usage: node render.mjs INPUT.json -o OUTPUT.html [--force]\n       node render.mjs INPUT.json --validate\n       node render.mjs --help';
function main(args) {
  if (args.length === 1 && args[0] === '--help') { console.log(usage); return; }
  let input, output, validateOnly = false, force = false;
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '-o' && !output && args[i + 1] && !args[i + 1].startsWith('-')) output = args[++i];
    else if (arg === '--validate' && !validateOnly) validateOnly = true;
    else if (arg === '--force' && !force) force = true;
    else if (!arg.startsWith('-') && !input) input = arg;
    else throw new Error(usage);
  }
  if (!input || (validateOnly ? output || force : !output)) throw new Error(usage);
  const inputPath = realpathSync(input);
  if (statSync(inputPath).size > 2 * 1024 * 1024) throw new Error('Input exceeds the 2 MiB renderer resource limit. Split the explanation.');
  const raw = readFileSync(inputPath, 'utf8');
  let document;
  try { document = JSON.parse(raw); } catch { throw new Error('Input is not valid JSON.'); }
  const errors = validate(document);
  if (errors.length) throw new Error(`Invalid teardown document:\n${errors.slice(0, 30).join('\n')}${errors.length > 30 ? '\nFurther errors omitted.' : ''}`);
  if (validateOnly) { loadImages(document, dirname(inputPath)); console.log(`Valid: ${resolve(input)}`); return; }
  const target = resolve(output);
  // Resolve the parent too, so a symlinked directory cannot disguise the input path.
  const canonicalTarget = resolve(realpathSync(dirname(target)), basename(target));
  if (canonicalTarget === inputPath) throw new Error('Output must not overwrite the input JSON.');
  let targetStat;
  try { targetStat = statSync(target); } catch (error) { if (error.code !== 'ENOENT') throw error; }
  const inputStat = statSync(inputPath);
  if (targetStat && inputStat.dev === targetStat.dev && inputStat.ino === targetStat.ino) throw new Error('Output must not overwrite the input JSON.');
  const html = render(document, { inputDirectory: dirname(inputPath) });
  for (const block of document.blocks.filter(b => b.type === 'image')) {
    const imagePath = realpathSync(resolve(dirname(inputPath), block.src));
    const imageStat = statSync(imagePath);
    if (canonicalTarget === imagePath || (targetStat && imageStat.dev === targetStat.dev && imageStat.ino === targetStat.ino)) {
      throw new Error('Output must not overwrite a source image.');
    }
  }
  if (!force) {
    // Exclusive creation protects output including dangling symlinks.
    const fd = openSync(target, 'wx', 0o600);
    try { writeFileSync(fd, html, 'utf8'); }
    catch (error) { closeSync(fd); unlinkSync(target); throw error; }
    closeSync(fd);
  } else {
    const temporary = resolve(dirname(target), `.teardown-${randomUUID()}.tmp`);
    try {
      writeFileSync(temporary, html, { encoding: 'utf8', flag: 'wx', mode: 0o600 });
      renameSync(temporary, target);
    } finally {
      try { unlinkSync(temporary); } catch (error) { if (error.code !== 'ENOENT') throw error; }
    }
  }
  console.log(`Rendered: ${target}`);
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try { main(process.argv.slice(2)); }
  catch (error) {
    console.error(error.code === 'EEXIST' ? 'Output already exists. Choose another path or use --force to replace it.' : error.message);
    process.exitCode = 1;
  }
}

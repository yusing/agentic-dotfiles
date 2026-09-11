import { parseMath } from './math.mjs';
import { readFileSync } from 'node:fs';

export const schema = JSON.parse(readFileSync(new URL('../schema.json', import.meta.url), 'utf8'));
const vocabulary = new Set(['$schema', '$id', '$defs', 'title', 'description', '$ref', 'type',
  'properties', 'required', 'additionalProperties', 'items', 'minItems', 'maxItems',
  'minLength', 'maxLength', 'minimum', 'pattern', 'enum', 'const', 'oneOf']);

// This evaluator deliberately implements only the bundled schema's vocabulary.
// Fail at load time if schema evolution would otherwise weaken validation silently.
function inspect(rule) {
  for (const key of Object.keys(rule)) {
    if (!vocabulary.has(key)) throw new Error(`Unsupported schema keyword: ${key}`);
  }
  if (rule.$ref && !schema.$defs[rule.$ref.replace('#/$defs/', '')]) throw new Error('Unresolved schema reference');
  for (const child of Object.values(rule.properties ?? {})) inspect(child);
  for (const child of Object.values(rule.$defs ?? {})) inspect(child);
  for (const child of rule.oneOf ?? []) inspect(child);
  if (rule.items) inspect(rule.items);
}
inspect(schema);

function check(value, rule, path, errors) {
  if (rule.$ref) return check(value, schema.$defs[rule.$ref.slice('#/$defs/'.length)], path, errors);
  if (rule.oneOf) {
    const results = rule.oneOf.map(branch => {
      const result = []; check(value, branch, path, result); return result;
    });
    if (results.filter(result => result.length === 0).length === 1) return;
    // Select the branch the author evidently meant, so the reported errors name the
    // offending field instead of every union branch. Block branches are identified by
    // their `type` const; inline branches by the JSON type they accept. Both guards are
    // needed: without the $ref test, an untyped object matches the first branch, because
    // an absent `type` const and an absent `value.type` are both undefined.
    const jsonType = Array.isArray(value) ? 'array' : value === null ? 'null' : typeof value;
    const index = rule.oneOf.findIndex(branch => branch.$ref
      ? schema.$defs[branch.$ref.slice('#/$defs/'.length)]?.properties?.type?.const === value?.type
      : branch.type === jsonType);
    if (index >= 0 && results[index].length) errors.push(...results[index]);
    else errors.push(`${path}: ${rule === schema.$defs.block ? 'unknown or ambiguous block type' : 'must match exactly one allowed shape'}`);
    return;
  }
  if ('const' in rule && value !== rule.const) errors.push(`${path}: must equal ${JSON.stringify(rule.const)}`);
  if (rule.enum && !rule.enum.includes(value)) errors.push(`${path}: expected one of ${rule.enum.join(', ')}`);
  if (rule.type === 'object') {
    if (value === null || typeof value !== 'object' || Array.isArray(value)) {
      errors.push(`${path}: expected object`); return;
    }
    for (const key of rule.required ?? []) if (!Object.hasOwn(value, key)) errors.push(`${path}.${key}: required`);
    for (const key of Object.keys(value)) {
      if (!Object.hasOwn(rule.properties, key)) errors.push(`${path}.${key}: unknown field`);
      else check(value[key], rule.properties[key], `${path}.${key}`, errors);
    }
  } else if (rule.type === 'array') {
    if (!Array.isArray(value)) { errors.push(`${path}: expected array`); return; }
    if (value.length < rule.minItems || value.length > rule.maxItems) errors.push(`${path}: expected ${rule.minItems}–${rule.maxItems} items`);
    value.forEach((item, i) => check(item, rule.items, `${path}[${i}]`, errors));
  } else if (rule.type === 'number') {
    if (typeof value !== 'number' || !Number.isFinite(value)) errors.push(`${path}: expected finite number`);
    else if (rule.minimum !== undefined && value < rule.minimum) errors.push(`${path}: must be at least ${rule.minimum}`);
  } else if (rule.type === 'string') {
    if (typeof value !== 'string') { errors.push(`${path}: expected string`); return; }
    const length = [...value].length;
    if (length < (rule.minLength ?? 0) || length > (rule.maxLength ?? Infinity)) errors.push(`${path}: invalid text length`);
    if (rule.pattern && !new RegExp(rule.pattern, 'u').test(value)) errors.push(`${path}: invalid format`);
  }
}

export function validate(document) {
  const errors = [];
  check(document, schema, '$', errors);
  if (errors.length) return errors;
  document.blocks.forEach((block, i) => {
    const path = `$.blocks[${i}]`;
    // One footer per figure. The schema vocabulary has no `not`, so the pair is
    // exclusive here rather than in schema.json; every captioned block accepts both fields.
    if (block.caption !== undefined && block.caption_md !== undefined) {
      errors.push(`${path}.caption_md: use caption or caption_md, not both`);
    }
    if (block.type === 'paired-pipeline' && block.stages.at(-1).connector !== undefined) {
      errors.push(`${path}.stages[${block.stages.length - 1}].connector: the last stage has no following stage`);
    }
    if (block.type === 'table') block.rows.forEach((row, r) => {
      if (row.length !== block.columns.length) errors.push(`${path}.rows[${r}]: row width must match columns`);
    });
    let nodes, edges, nodeKey, edgeKey;
    if (block.type === 'flow') [nodes, edges, nodeKey, edgeKey] = [block.nodes, block.edges, 'nodes', 'edges'];
    if (block.type === 'state-machine') [nodes, edges, nodeKey, edgeKey] = [block.states, block.transitions, 'states', 'transitions'];
    if (block.type === 'sequence') [nodes, edges, nodeKey, edgeKey] = [block.participants, block.steps, 'participants', 'steps'];
    if (nodes) {
      const ids = new Set();
      nodes.forEach((node, n) => {
        if (ids.has(node.id)) errors.push(`${path}.${nodeKey}[${n}].id: duplicate ID`);
        ids.add(node.id);
      });
      edges.forEach((edge, e) => {
        for (const end of ['from', 'to']) if (!ids.has(edge[end])) errors.push(`${path}.${edgeKey}[${e}].${end}: unknown endpoint`);
      });
      if (block.type === 'state-machine' && block.states.filter(s => s.kind === 'initial').length !== 1) {
        errors.push(`${path}.states: exactly one initial state required`);
      }
    }
    if (block.type === 'math') {
      for (const key of ['title', 'description']) if (!block[key].trim()) errors.push(`${path}.${key}: meaningful text required`);
      try { parseMath(block.expression); } catch (error) { errors.push(`${path}.expression: ${error.message}`); }
    }
    if (block.type === 'bar-chart') {
      for (const key of ['title', 'unit', 'context']) if (!block[key].trim()) errors.push(`${path}.${key}: meaningful text required`);
      const labels = new Set();
      block.items.forEach((item, n) => {
        const label = item.label.trim();
        if (!label) errors.push(`${path}.items[${n}].label: meaningful label required`);
        if (labels.has(label)) errors.push(`${path}.items[${n}].label: duplicate label`);
        labels.add(label);
      });
    }
    if (block.type === 'image') {
      if (!block.alt.trim()) errors.push(`${path}.alt: meaningful alt text required`);
      if (block.src.startsWith('/') || block.src.split('/').some(p => !p || p === '.' || p === '..') || /[\\:\u0000-\u001f\u007f]/u.test(block.src)) {
        errors.push(`${path}.src: expected relative slash-separated path without empty, dot, parent, colon, backslash, or control characters`);
      }
    }
    if (block.type === 'file-tree') {
      const paths = new Set();
      block.entries.forEach((entry, e) => {
        if (entry.path.startsWith('/') || entry.path.split('/').some(p => !p || p === '.' || p === '..') || entry.path.includes('\\')) {
          errors.push(`${path}.entries[${e}].path: expected relative slash-separated path without empty, dot, or parent segments`);
        }
        if (paths.has(entry.path)) errors.push(`${path}.entries[${e}].path: duplicate path`);
        paths.add(entry.path);
      });
    }
  });
  return errors;
}

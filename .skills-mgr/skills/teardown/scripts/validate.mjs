import { readFileSync } from 'node:fs';

export const schema = JSON.parse(readFileSync(new URL('../schema.json', import.meta.url), 'utf8'));
const vocabulary = new Set(['$schema', '$id', '$defs', 'title', 'description', '$ref', 'type',
  'properties', 'required', 'additionalProperties', 'items', 'minItems', 'maxItems',
  'minLength', 'maxLength', 'pattern', 'enum', 'const', 'oneOf']);

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
    // Select a recognized block to show useful field errors instead of every union branch.
    const index = rule.oneOf.findIndex(branch => schema.$defs[branch.$ref?.slice(8)]?.properties?.type?.const === value?.type);
    if (index >= 0 && results[index].length) errors.push(...results[index]);
    else errors.push(`${path}: unknown or ambiguous block type`);
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

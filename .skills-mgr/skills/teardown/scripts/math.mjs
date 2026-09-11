import { escape } from './escape.mjs';

const greek = {
  alpha: 'α', beta: 'β', gamma: 'γ', delta: 'δ', epsilon: 'ε', zeta: 'ζ', eta: 'η', theta: 'θ',
  iota: 'ι', kappa: 'κ', lambda: 'λ', mu: 'μ', nu: 'ν', xi: 'ξ', pi: 'π', rho: 'ρ', sigma: 'σ',
  tau: 'τ', upsilon: 'υ', phi: 'φ', chi: 'χ', psi: 'ψ', omega: 'ω',
  Gamma: 'Γ', Delta: 'Δ', Theta: 'Θ', Lambda: 'Λ', Xi: 'Ξ', Pi: 'Π', Sigma: 'Σ',
  Upsilon: 'Υ', Phi: 'Φ', Psi: 'Ψ', Omega: 'Ω',
};
const operators = {
  times: '×', cdot: '·', div: '÷', pm: '±', mp: '∓', le: '≤', leq: '≤', ge: '≥', geq: '≥',
  ne: '≠', neq: '≠', approx: '≈', equiv: '≡', in: '∈', notin: '∉', subset: '⊂', subseteq: '⊆',
  cup: '∪', cap: '∩', to: '→', rightarrow: '→', leftarrow: '←', Rightarrow: '⇒',
  infty: '∞', ldots: '…', partial: '∂', nabla: '∇', forall: '∀', exists: '∃',
  sum: '∑', prod: '∏', int: '∫',
};
const functions = new Set(['sin', 'cos', 'tan', 'log', 'ln', 'exp', 'min', 'max', 'lim']);

/** Convert the documented, bounded notation into renderer-owned MathML children. */
export function parseMath(source) {
  if (typeof source !== 'string' || !source.trim() || source.length > 2000) throw new Error('expected 1–2000 characters of math notation');
  let position = 0, atoms = 0;
  const skip = () => { while (/\s/u.test(source[position] ?? '') && position < source.length) position++; };
  const fail = message => { throw new Error(`${message} at character ${position + 1}`); };
  function row(end, depth) {
    if (depth > 24) fail('math nesting exceeds 24 levels');
    const parts = [];
    skip();
    while (position < source.length && source[position] !== end) {
      let base = atom(depth, false);
      let sub, sup;
      skip();
      while (source[position] === '_' || source[position] === '^') {
        const kind = source[position++];
        if ((kind === '_' && sub !== undefined) || (kind === '^' && sup !== undefined)) fail('duplicate script on one base');
        const script = atom(depth + 1, true);
        if (kind === '_') sub = script;
        else sup = script;
        skip();
      }
      if (sub !== undefined && sup !== undefined) base = `<msubsup>${base}${sub}${sup}</msubsup>`;
      else if (sub !== undefined) base = `<msub>${base}${sub}</msub>`;
      else if (sup !== undefined) base = `<msup>${base}${sup}</msup>`;
      parts.push(base);
    }
    if (end) {
      if (source[position] !== end) fail(`expected ${end}`);
      position++;
    }
    if (!parts.length) fail('empty expression');
    return `<mrow>${parts.join('')}</mrow>`;
  }
  function group(depth) {
    skip();
    if (source[position++] !== '{') fail('expected {');
    return row('}', depth + 1);
  }
  function atom(depth, single) {
    if (depth > 24) fail('math nesting exceeds 24 levels');
    if (++atoms > 1000) fail('math exceeds 1000 atoms');
    skip();
    const character = source[position++];
    if (!character) fail('expected an expression');
    if (character === '{') return row('}', depth + 1);
    if (character === '\\') {
      const name = /^[A-Za-z]+/.exec(source.slice(position))?.[0];
      if (!name) fail('expected a supported command');
      position += name.length;
      if (Object.hasOwn(greek, name)) return `<mi>${greek[name]}</mi>`;
      if (Object.hasOwn(operators, name)) return `<mo>${operators[name]}</mo>`;
      if (functions.has(name)) return `<mi mathvariant="normal">${name}</mi>`;
      if (name === 'frac') return `<mfrac>${group(depth)}${group(depth)}</mfrac>`;
      if (name === 'sqrt') {
        skip();
        let index;
        if (source[position] === '[') { position++; index = row(']', depth + 1); }
        const radicand = group(depth);
        return index ? `<mroot>${radicand}${index}</mroot>` : `<msqrt>${radicand}</msqrt>`;
      }
      if (name === 'text') {
        skip();
        if (source[position++] !== '{') fail('expected { after text');
        const end = source.indexOf('}', position);
        if (end < 0) fail('expected } after text');
        const text = source.slice(position, end);
        if (!text.trim() || /[{}\\]/u.test(text)) fail('text requires nonempty plain text without braces or commands');
        position = end + 1;
        return `<mtext>${escape(text)}</mtext>`;
      }
      fail(`unsupported command \\${name}`);
    }
    if (/[0-9]/.test(character)) {
      const remainder = single ? '' : /^[0-9]*(?:\.[0-9]+)?/.exec(source.slice(position))[0];
      position += remainder.length;
      return `<mn>${character}${remainder}</mn>`;
    }
    if (/\p{L}/u.test(character)) return `<mi>${escape(character)}</mi>`;
    if ('+-=<>()[|],;!/:.×·÷±∓≤≥≠≈≡∈∉⊂⊆∪∩→←⇒∞…∂∇∀∃∑∏∫'.includes(character)) return `<mo>${escape(character)}</mo>`;
    fail(`unsupported character ${character}`);
  }
  return row(undefined, 0);
}

export function mathMarkup(source, display = 'inline') {
  return `<math xmlns="http://www.w3.org/1998/Math/MathML" display="${display}"><semantics>${parseMath(source)}<annotation encoding="application/x-tex">${escape(source)}</annotation></semantics></math>`;
}

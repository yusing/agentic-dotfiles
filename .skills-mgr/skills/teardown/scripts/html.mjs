import { loadImages } from './images.mjs';
import { readFileSync } from 'node:fs';
import { validate } from './validate.mjs';
import { escape } from './escape.mjs';
import { mathMarkup } from './math.mjs';
export { escape };

const css = readFileSync(new URL('../assets/style.css', import.meta.url), 'utf8');

function equation(source, display, title = 'Inline equation') {
  const markup = mathMarkup(source, display);
  // A conservative print fallback: keep long formulas readable rather than clipping or
  // shrinking them. Counting presentation text overestimates stacked fractions/scripts.
  const text = markup.split('<annotation')[0].replace(/<[^>]+>/g, '');
  const length = [...text].length;
  const long = length > 40;
  const scroll = length > 16 ? ` role="region" tabindex="0" aria-label="${escape(title)}, scroll horizontally"` : '';
  const tag = display === 'block' ? 'div' : 'span';
  const wrapper = display === 'block' ? 'math-scroll' : 'inline-math-scroll';
  const className = display === 'block' ? 'math-equation' : 'inline-math';
  return `<${tag} class="${wrapper}"${scroll}><span class="${className}${long ? ' math-print-source' : ''}">${markup}${long ? `<span class="math-source">${escape(source)}</span>` : ''}</span></${tag}>`;
}

const badgeTones = new Set(['neutral', 'positive', 'warning', 'danger']);

// Consume a whole badge-like run before checking its closed grammar, so an invalid
// outer label cannot expose an inner badge or link to the inline tokenizer.
function badge(text, start) {
  let end = start + ':badge'.length;
  function group(open, close) {
    if (text[end] !== open) return undefined;
    const begin = ++end;
    let depth = 1;
    while (end < text.length && text[end] !== '\n') {
      const character = text[end++];
      if (character === open) depth++;
      else if (character === close && --depth === 0) return text.slice(begin, end - 1);
    }
    return undefined;
  }
  const label = group('[', ']')?.trim();
  const tone = group('{', '}');
  const valid = label && !/[\[\]]/.test(label) && [...label].length <= 40 && badgeTones.has(tone);
  return { end, html: valid ? `<span class="inline-badge ${tone}">${escape(label)}</span>` : escape(text.slice(start, end)) };
}

function inline(text) {
  // Tokenize before escaping; unmatched and unsupported syntax remains literal text.
  const pattern = /`(?<code>[^`\n]+)`|\\\((?<math>[^\n]*?)\\\)|(?<badgeStart>:badge\[)|\*\*(?<strong>[^*\n]+)\*\*|\*(?<emphasis>[^*\n]+)\*|(?<!!)\[(?<linkLabel>[^\]\n]+)\]\((?<linkUrl>https?:\/\/[^\s()]+)\)/g;
  let result = '', start = 0;
  let match;
  while ((match = pattern.exec(text)) !== null) {
    result += escape(text.slice(start, match.index));
    const token = match.groups;
    if (token.code !== undefined) result += `<code>${escape(token.code)}</code>`;
    else if (token.math !== undefined) {
      try { result += equation(token.math, 'inline'); }
      catch { result += escape(match[0]); }
    } else if (token.badgeStart !== undefined) {
      const parsed = badge(text, match.index);
      result += parsed.html;
      pattern.lastIndex = parsed.end;
    } else if (token.strong !== undefined) result += `<strong>${escape(token.strong)}</strong>`;
    else if (token.emphasis !== undefined) result += `<em>${escape(token.emphasis)}</em>`;
    else result += `<a href="${escape(token.linkUrl)}" rel="noreferrer">${escape(token.linkLabel)}</a>`;
    start = pattern.lastIndex;
  }
  return result + escape(text.slice(start));
}

export function markdown(text) {
  return text.split(/\n\s*\n/).map(paragraph => {
    const lines = paragraph.split('\n');
    if (lines.every(line => /^[-*] /.test(line))) return `<ul>${lines.map(line => `<li>${inline(line.slice(2))}</li>`).join('')}</ul>`;
    return `<p>${inline(paragraph).replaceAll('\n', '<br>')}</p>`;
  }).join('');
}

function wrap(text, width) {
  const lines = [];
  let line = '';
  for (const word of text.split(/\s+/)) {
    if (line && [...line + ' ' + word].length > width) { lines.push(line); line = ''; }
    const chunks = Array.from(word);
    if (chunks.length > width) {
      if (line) { lines.push(line); line = ''; }
      while (chunks.length > width) lines.push(chunks.splice(0, width).join(''));
      line = chunks.join('');
    } else line += (line ? ' ' : '') + word;
  }
  if (line) lines.push(line);
  return lines;
}
function svgText(text, x, y, width, className = '') {
  return `<text class="${className}" x="${x}" y="${y}">${wrap(text, width).map((line, i) => `<tspan x="${x}" dy="${i ? 18 : 0}">${escape(line)}</tspan>`).join('')}</text>`;
}
function arrowDefs(id) {
  return `<defs><marker id="arrow-${id}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" class="arrowhead"/></marker></defs>`;
}
function edgeList(nodes, edges) {
  const labels = new Map(nodes.map(n => [n.id, n.label]));
  return `<ol class="edge-list">${edges.map(e => `<li><span class="edge-route">${escape(labels.get(e.from))} <span aria-label="to">→</span> ${escape(labels.get(e.to))}</span><span>${escape(e.label)}</span></li>`).join('')}</ol>`;
}
function diagramFrame(block, svg, nodes, transcript, width, height) {
  const printTextOnly = Math.min(700 / width, 870 / height) < 0.8;
  const key = `<dl class="diagram-node-key">${nodes.map(node => `<div><dt>${escape(node.label)}</dt><dd>${node.kind ? `<strong>${escape(node.kind)}</strong>${node.detail ? ': ' : ''}` : ''}${node.detail ? escape(node.detail) : node.kind ? '' : 'Participant or node'}</dd></div>`).join('')}</dl>`;
  return `<div class="diagram${printTextOnly ? ' print-text-only' : ''}"><div class="diagram-scroll" tabindex="0" role="region" aria-label="${escape(block.title)} visual diagram, scroll horizontally">${svg}</div><div class="diagram-transcript">${key}${transcript}</div></div>`;
}
const BOX_LEFT = 20, BOX_WIDTH = 390, GRAPH_PAD = 30, NODE_GAP = 55;

function graph(block, id) {
  const nodes = block.nodes ?? block.states;
  const edges = block.edges ?? block.transitions;
  let y = GRAPH_PAD;
  const positions = nodes.map(node => {
    const labelLines = wrap(node.label, 32).length;
    const detailLines = node.detail ? wrap(node.detail, 44).length : 0;
    const height = 40 + labelLines * 18 + detailLines * 18 + (node.kind ? 22 : 0);
    const pos = { y, height, labelLines }; y += height + NODE_GAP; return pos;
  });
  // Drop the gap trailing the last node so the frame does not end in dead space.
  const height = y - NODE_GAP + GRAPH_PAD;
  const index = new Map(nodes.map((n, i) => [n.id, i]));
  const boxRight = BOX_LEFT + BOX_WIDTH;
  // Edges that skip, revisit or double up route around the column instead of straight down.
  const detours = edges.map(edge => !(index.get(edge.to) === index.get(edge.from) + 1
    && edges.filter(other => other.from === edge.from && other.to === edge.to).length === 1));
  const trackOf = e => 450 + e * 18;
  // Size to what is actually drawn: only routed edges reach past the node column.
  const width = Math.max(boxRight, ...detours.map((routed, e) => routed ? trackOf(e) + 12 : 0)) + 20;
  const paths = edges.map((edge, e) => {
    const a = positions[index.get(edge.from)], b = positions[index.get(edge.to)];
    let d, badgeX, badgeY;
    if (!detours[e]) {
      d = `M 215 ${a.y + a.height} V ${b.y - 3}`;
      badgeX = 215; badgeY = (a.y + a.height + b.y) / 2;
    } else {
      const start = a.y + a.height / 2 - 10, end = b.y + b.height / 2 + 10;
      d = `M ${boxRight} ${start} H ${trackOf(e)} V ${end} H ${boxRight + 3}`;
      badgeX = trackOf(e); badgeY = start;
    }
    return `<path d="${d}" class="connector" marker-end="url(#arrow-${id})"/><circle cx="${badgeX}" cy="${badgeY}" r="12" class="edge-badge"/><text x="${badgeX}" y="${badgeY + 4}" class="edge-number">${e + 1}</text>`;
  }).join('');
  const boxes = nodes.map((node, i) => {
    const p = positions[i];
    return `<g><rect x="${BOX_LEFT}" y="${p.y}" width="${BOX_WIDTH}" height="${p.height}" rx="3" class="graph-node ${node.kind ?? ''}"/>${svgText(node.label, 40, p.y + 28, 32, 'node-label')}${node.detail ? svgText(node.detail, 40, p.y + 34 + p.labelLines * 18, 44, 'node-detail') : ''}${node.kind ? svgText(node.kind.toUpperCase(), 40, p.y + p.height - 14, 44, 'state-kind') : ''}</g>`;
  }).join('');
  const svg = `<svg viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" aria-hidden="true">${arrowDefs(id)}${paths}${boxes}</svg>`;
  return diagramFrame(block, svg, nodes, edgeList(nodes, edges), width, height);
}
function sequence(block, id) {
  const spacing = 190, halfLane = 80, pad = 20;
  const x = new Map(block.participants.map((p, i) => [p.id, pad + halfLane + i * spacing]));
  const laneLines = block.participants.map(p => wrap(p.label, 18).length);
  const laneHeight = 22 + Math.max(...laneLines) * 18;
  const lifelineTop = 15 + laneHeight;
  // A self message loops right of its lifeline and carries its label there too.
  const selfReach = (step, i) => 8 + Math.max(...wrap(`${i + 1}. ${step.label}`, 20)
    .map(line => [...line].length)) * 7.4;
  const width = Math.ceil(Math.max(
    pad + halfLane + (block.participants.length - 1) * spacing + halfLane,
    ...block.steps.map((step, i) => step.from === step.to ? x.get(step.from) + selfReach(step, i) : 0),
  ) + pad);
  let y = lifelineTop + 40;
  const steps = block.steps.map((step, i) => {
    const a = x.get(step.from), b = x.get(step.to);
    const lines = wrap(`${i + 1}. ${step.label}`, a === b ? 20 : Math.max(20, Math.floor(Math.abs(a - b) / 8))).length;
    const textY = y;
    y += lines * 18 + 12;
    const path = a === b ? `M ${a} ${y} h 65 v 25 h -65` : `M ${a} ${y} H ${b}`;
    const result = `${svgText(`${i + 1}. ${step.label}`, a === b ? a + 8 : (a + b) / 2, textY, a === b ? 20 : Math.max(20, Math.floor(Math.abs(a - b) / 8)), a === b ? 'self-label' : 'message-label')}<path d="${path}" class="connector ${step.kind}" marker-end="url(#arrow-${id})"/>`;
    y += a === b ? 70 : 50;
    return result;
  }).join('');
  const lanes = block.participants.map(p => `<path d="M ${x.get(p.id)} ${lifelineTop} V ${y}" class="lifeline"/><rect x="${x.get(p.id) - halfLane}" y="15" width="${halfLane * 2}" height="${laneHeight}" rx="3" class="graph-node"/>${svgText(p.label, x.get(p.id), 37, 18, 'participant-label')}`).join('');
  const svg = `<svg viewBox="0 0 ${width} ${y + 20}" width="${width}" height="${y + 20}" aria-hidden="true">${arrowDefs(id)}${lanes}${steps}</svg>`;
  const transcript = `<ol class="edge-list">${block.steps.map(step => `<li><span class="edge-route">${escape(block.participants.find(p => p.id === step.from).label)} → ${escape(block.participants.find(p => p.id === step.to).label)} <small>${escape(step.kind)}</small></span><span>${escape(step.label)}</span></li>`).join('')}</ol>`;
  return diagramFrame(block, svg, block.participants, transcript, width, y + 20);
}
function fileTree(entries) {
  const root = new Map();
  for (const entry of entries) {
    let current = root;
    const parts = entry.path.split('/');
    parts.forEach((part, i) => {
      if (!current.has(part)) current.set(part, { children: new Map(), responsibility: '' });
      const node = current.get(part);
      if (i === parts.length - 1) node.responsibility = entry.responsibility;
      current = node.children;
    });
  }
  function lines(nodes, prefix = '') {
    return [...nodes].map(([name, node], i) => {
      const last = i === nodes.size - 1;
      return `${escape(prefix + (last ? '└── ' : '├── ') + name + (node.children.size ? '/' : ''))}${node.responsibility ? ` <span class="tree-note">${escape('  # ' + node.responsibility)}</span>` : ''}\n${lines(node.children, prefix + (last ? '    ' : '│   '))}`;
    }).join('');
  }
  return `<pre class="file-tree" tabindex="0"><code>${lines(root)}</code></pre>`;
}

function metricValue(value) {
  if (typeof value === 'string') return escape(value);
  const separator = value.separator === 'slash' ? '<span class="metric-separator">/</span>' : ' ';
  return value.parts.map(part => `<span class="metric-part">${escape(part.value)}${part.unit ? `<small class="metric-unit"> ${escape(part.unit)}</small>` : ''}</span>`).join(separator);
}

// Every captioned block takes plain `caption` or safe `caption_md`; validation rejects both.
function figcaption(block) {
  const text = block.caption_md ? markdown(block.caption_md) : block.caption ? escape(block.caption) : '';
  return text ? `<figcaption>${text}</figcaption>` : '';
}

function metrics(block, heading) {
  const status = block.status
    ? `<span class="metric-status ${block.status.tone}"><span class="status-dot" aria-hidden="true"></span>${escape(block.status.label)}</span>` : '';
  // Metadata alone still needs the header bar, but not an empty heading box beside it.
  const headingBox = heading || status ? `<div class="metric-heading">${heading}${status}</div>` : '';
  const header = headingBox || block.metadata
    ? `<header class="metric-header">${headingBox}${block.metadata ? `<p class="metric-metadata">${escape(block.metadata)}</p>` : ''}</header>` : '';
  return `<figure class="metric-panel">${header}<dl class="metrics">${block.items.map(item => `<div><dt>${escape(item.label)}</dt><dd class="metric-value">${metricValue(item.value)}</dd>${item.source ? `<dd class="metric-source"><code>${escape(item.source)}</code></dd>` : ''}<dd class="metric-context">${escape(item.context)}</dd></div>`).join('')}</dl>${figcaption(block)}</figure>`;
}

// Two implementations of one ordered mechanism. A table is the honest structure: the
// tracks are columns, the stages are rows, and each connector spans both tracks because
// the step between stages is shared. Stage numbers are presentational, so the row header
// carries the stage name for a screen reader and the numeral is hidden from it.
function pairedPipeline(block, heading) {
  const header = `<tr><td class="pipeline-row-label"></td>${block.tracks.map(track => `<th scope="col">${track.note ? `<span class="kicker">${escape(track.note)}</span>` : ''}${escape(track.label)}</th>`).join('')}</tr>`;
  const rows = block.stages.map((stage, n) => {
    const cells = stage.cells.map(cell => `<td><div class="pipeline-card"><strong class="pipeline-stage"><span class="pipeline-number" aria-hidden="true">${String(n + 1).padStart(2, '0')}</span>${escape(stage.label)}</strong><code>${escape(cell)}</code></div></td>`).join('');

    const connector = stage.connector
      ? `<tr class="pipeline-connector"><td colspan="3"><span class="pipeline-arrow" aria-hidden="true">↓</span><span class="pipeline-handoff">${escape(stage.connector)}</span><span class="pipeline-arrow" aria-hidden="true">↓</span></td></tr>` : '';
    return `<tr><th class="pipeline-row-label" scope="row"><span>${escape(stage.label)}</span></th>${cells}</tr>${connector}`;
  }).join('');
  return `<figure>${heading}<div class="table-scroll pipeline-scroll" role="region" aria-label="${escape(block.title)}, scroll horizontally" tabindex="0"><table class="pipeline"><thead>${header}</thead><tbody>${rows}</tbody></table></div>${figcaption(block)}</figure>`;
}

function barChart(block, heading) {
  const maximum = Math.max(...block.items.map(item => item.value));
  let y = 28;
  const bars = block.items.map(item => {
    const reading = `${item.value} ${block.unit}`;
    const label = svgText(item.label, 24, y, 40, 'chart-label');
    y += wrap(item.label, 40).length * 18 + 4;
    const labels = label + svgText(reading, 616, y, 40, 'chart-value');
    y += (wrap(reading, 40).length - 1) * 18 + 14;
    // Divide first: multiplication before division can overflow for valid finite values.
    const width = maximum === 0 ? 0 : item.value / maximum * 592;
    const bar = `<rect class="chart-track" x="24" y="${y}" width="592" height="14"/><rect class="chart-bar" x="24" y="${y}" width="${width}" height="14"/>`;
    y += 48;
    return labels + bar;
  }).join('');
  return `<figure>${heading}<p class="chart-context">${escape(block.context)}</p><p class="chart-scale">Scale: 0–${escape(maximum)} ${escape(block.unit)}. All bars start at zero.</p><div class="chart-scroll" role="region" tabindex="0" aria-label="${escape(block.title)}, chart scrolls horizontally; data table follows"><svg xmlns="http://www.w3.org/2000/svg" width="640" height="${y - 16}" viewBox="0 0 640 ${y - 16}" aria-hidden="true">${bars}</svg></div><table class="chart-data"><caption>${escape(block.title)} — supplied data (${escape(block.unit)})</caption><thead><tr><th scope="col">Category</th><th scope="col">Value (${escape(block.unit)})</th></tr></thead><tbody>${block.items.map(item => `<tr><th scope="row">${escape(item.label)}</th><td>${escape(item.value)}</td></tr>`).join('')}</tbody></table>${figcaption(block)}</figure>`;
}

function renderBlock(block, i, level, images) {
  const id = `block-${i + 1}`;
  const heading = block.title ? `<h${level}>${escape(block.title)}</h${level}>` : '';
  const caption = figcaption(block);
  let body;
  switch (block.type) {
    case 'math': body = `<figure>${heading}${equation(block.expression, 'block', block.title)}<p class="math-description">${escape(block.description)}</p>${caption}</figure>`; break;
    case 'bar-chart': body = barChart(block, heading); break;
    case 'image': body = `<figure class="image-figure">${heading}<img src="${images.get(i).src}" alt="${escape(block.alt)}">${caption}</figure>`; break;
    case 'prose': body = markdown(block.body_md); break;
    case 'callout': body = `<div class="callout ${block.tone}"><span class="kicker">${block.tone}</span>${heading}${markdown(block.body_md)}</div>`; break;
    case 'capability-grid': body = `${heading}<div class="card-grid">${block.cells.map(cell => `<div class="capability"><span class="status ${cell.status}">${escape(cell.status)}</span>${block.title ? `<h${level + 1}>${escape(cell.label)}</h${level + 1}>` : `<strong class="capability-label">${escape(cell.label)}</strong>`}<p>${escape(cell.detail)}</p></div>`).join('')}</div>`; break;
    case 'evidence': body = `<div class="evidence"><span class="kicker">Evidence · ${block.confidence}</span>${heading}${markdown(block.text_md)}${block.sources.length ? `<ul class="sources" role="list">${block.sources.map(s => `<li role="listitem"><strong>${escape(s.label)}</strong><code>${escape(s.location)}</code></li>`).join('')}</ul>` : '<p class="muted">No source locations supplied.</p>'}</div>`; break;
    case 'comparison': body = `${heading}<div class="comparison-grid">${block.columns.map(c => `<div class="comparison-column"><h${level + 1}>${escape(c.label)}</h${level + 1}>${markdown(c.body_md)}</div>`).join('')}</div>`; break;
    case 'table': body = `<figure>${heading}<div class="table-scroll" role="region" aria-label="${escape(block.title)}, scroll horizontally" tabindex="0"><table><thead><tr>${block.columns.map(c => `<th scope="col">${escape(c)}</th>`).join('')}</tr></thead><tbody>${block.rows.map(row => `<tr>${row.map((cell, c) => c === 0 ? `<th scope="row">${escape(cell)}</th>` : `<td>${escape(cell)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>${caption}</figure>`; break;
    case 'flow': case 'state-machine': body = `<figure>${heading}${graph(block, id)}${caption}</figure>`; break;
    case 'sequence': body = `<figure>${heading}${sequence(block, id)}${caption}</figure>`; break;
    case 'code': body = `<figure>${heading}<div class="code-header">${escape(block.language)}</div><pre class="code-block" tabindex="0"><code>${escape(block.code)}</code></pre>${caption}</figure>`; break;
    case 'anatomy': body = `<figure>${heading}<ol class="anatomy" role="list">${block.parts.map(part => `<li class="${part.emphasis ?? 'normal'}"><code>${escape(part.value)}</code><div><strong>${escape(part.label)}</strong><p>${escape(part.detail)}</p></div></li>`).join('')}</ol>${caption}</figure>`; break;
    // Annotation code wraps instead of scrolling, so these excerpts are neither scroll
    // regions nor tab stops: a landmark and a focus stop per row would be noise.
    case 'annotated-code': body = `<figure>${heading}<div class="code-header">${escape(block.language)}</div><div class="annotations">${block.rows.map(row => `<div class="annotation-row ${row.tone ?? 'note'}"><pre><code>${escape(row.code)}</code></pre><div class="annotation-text">${row.tone === 'warning' ? '<span class="status partial">Warning</span>' : ''}${markdown(row.explanation_md)}</div></div>`).join('')}</div>${caption}</figure>`; break;
    case 'paired-pipeline': body = pairedPipeline(block, heading); break;
    case 'requirements': body = `<figure>${heading}<dl class="requirements">${block.items.map(item => `<div><dt>${escape(item.label)}</dt><dd class="requirement-value">${escape(item.value)}</dd><dd class="requirement-detail">${markdown(item.detail_md)}</dd></div>`).join('')}</dl>${caption}</figure>`; break;
    case 'questions': body = `<figure>${heading}<ul class="questions" role="list">${block.items.map(item => `<li><h${level + 1}>${escape(item.question)}</h${level + 1}>${markdown(item.context_md)}</li>`).join('')}</ul>${caption}</figure>`; break;
    case 'file-tree': body = heading + fileTree(block.entries); break;
    case 'metrics': body = metrics(block, heading); break;
    case 'checklist': body = `${heading}<ul class="checklist">${block.items.map(item => `<li><span class="status ${item.status}">${item.status}</span><div><strong>${escape(item.label)}</strong>${item.detail ? `<p>${escape(item.detail)}</p>` : ''}</div></li>`).join('')}</ul>`; break;
    case 'glossary': body = `${heading}<dl class="glossary">${block.terms.map(term => `<div><dt>${escape(term.term)}</dt><dd>${escape(term.definition)}</dd></div>`).join('')}</dl>`; break;
    default: throw new Error(`No renderer for ${block.type}`);
  }
  return `<div id="${id}" class="block block-${block.type}">${body}</div>`;
}

// Per-entry half of the contents position tracking. Each navigable region names
// a view timeline; the matching link consumes it. `timeline-scope` is what lets
// a link reference a timeline declared on an element it does not contain.
// Regions are addressed with :has() rather than :nth-of-type so the rules do not
// depend on sibling order. Sectioned documents put the id on the chapter header,
// so the timeline goes on the enclosing section, which spans the whole chapter;
// otherwise the navigable block already spans its own content.
function tocTimelineCss(navigation, sectioned) {
  if (!navigation.length) return '';
  const names = navigation.map((_, n) => `--toc-${n + 1}`);
  const rules = navigation.map(({ i }, n) => {
    const id = `block-${i + 1}`, name = names[n];
    const region = sectioned ? `.chapter:has(> #${id})` : `#${id}`;
    return `${region}{view-timeline-name:${name};view-timeline-inset:22% 77%}`
      + `.contents a[href="#${id}"]{animation:toc-here steps(1);animation-timeline:${name}}`;
  }).join('');
  // Without scroll-driven animations, mark the entry the reader clicked instead.
  const fallback = navigation.map(({ i }) => `.page:has(#block-${i + 1}:target) .contents a[href="#block-${i + 1}"]`).join(',');
  return `.reading-layout{timeline-scope:${names.join(',')}}${rules}`
    + `@supports not (animation-timeline:scroll()){${fallback}{color:var(--ink);border-left-color:var(--accent)}}`;
}

export function render(document, { inputDirectory } = {}) {
  const errors = validate(document);
  if (errors.length) throw new Error(errors.slice(0, 30).join('\n'));
  const images = loadImages(document, inputDirectory);
  const sections = document.blocks.filter(b => b.type === 'section');
  const navigation = document.blocks.map((b, i) => ({ b, i })).filter(({ b }) => sections.length ? b.type === 'section' : b.title);
  let body = '', sectionOpen = false, sectionNumber = 0;
  document.blocks.forEach((block, i) => {
    if (block.type === 'section') {
      if (sectionOpen) body += '</section>';
      body += `<section class="chapter" aria-labelledby="heading-${i + 1}"><header id="block-${i + 1}" class="chapter-heading"><span class="chapter-number" aria-hidden="true">${String(++sectionNumber).padStart(2, '0')}</span><div><h2 id="heading-${i + 1}">${escape(block.title)}</h2>${block.summary ? `<p>${escape(block.summary)}</p>` : ''}</div></header>`;
      sectionOpen = true;
    } else body += renderBlock(block, i, sectionOpen ? 3 : 2, images);
  });
  if (sectionOpen) body += '</section>';
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="color-scheme" content="light dark"><meta name="theme-color" content="#eef2f2" media="(prefers-color-scheme: light)"><meta name="theme-color" content="#172125" media="(prefers-color-scheme: dark)"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src data:; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'"><title>${escape(document.title)}</title><style>${css}${tocTimelineCss(navigation, sections.length > 0)}</style></head>
<body><a class="skip-link" href="#content">Skip to explanation</a><div class="page"><header class="masthead"><div class="masthead-meta"><span class="eyebrow">${escape(document.eyebrow ?? document.type.replaceAll('-', ' '))}</span></div><h1>${escape(document.title)}</h1><p class="lede">${escape(document.lede)}</p></header><div class="reading-layout">${navigation.length ? `<aside class="contents"><nav aria-label="On this page"><p class="kicker">On this page</p><ol>${navigation.map(({ b, i }, n) => `<li><a href="#block-${i + 1}"><span aria-hidden="true">${String(n + 1).padStart(2, '0')}</span>${escape(b.title)}</a></li>`).join('')}</ol></nav></aside>` : ''}<main id="content">${body}</main></div><footer><span>Built with teardown</span><span>${escape(document.type.replaceAll('-', ' '))} · schema ${escape(document.schema_version)}</span></footer></div></body></html>\n`;
}

# Choosing blocks

Choose the structure that reveals the idea, not the block that looks most elaborate. The JSON
Schema is the field authority. All objects reject extra properties. `schema_version` is `"1.0"`;
root `type` is `module-teardown`, `concept-guide`, `comparison`, or `walkthrough`. These are
semantic labels, not fixed page templates. Root `title`, `lede`, and `blocks` are required;
`eyebrow` is optional. Use sections only when the document needs chapters.

| Block | Use it to explain | Selection boundary |
| --- | --- | --- |
| `callout` | The conclusion, a caveat, or a consequential constraint | One clear point. `tip` recommends, `note` adds context, `warning` flags risk, `danger` signals serious harm. |
| `capability-grid` | What a system can and cannot do | Use `supported`, `unsupported`, `partial`, or `unknown`. Missing evidence means unknown, not unsupported. Every cell needs a concrete detail. |
| `evidence` | Why the reader should believe a nearby claim | `observed` means directly established; `inferred` means reasoned from evidence; `unknown` exposes an unresolved point. Cite source labels and locations, not invented findings. |
| `prose` | A connective explanation without an artificial container | Use between visuals to explain what follows from them. |
| `section` | A new reader question or chapter | Supply a meaningful title and optional short summary. Following blocks belong to this section until the next section. |
| `comparison` | Two to four alternatives with qualitative differences | Use columns with parallel criteria. Prefer a table when readers need exact row-by-row lookup. |
| `table` | Repeated attributes across comparable items | Supply column labels and equal-width rows. Cells are plain text. Keep wide tables out of the main argument. |
| `flow` | Ownership, dependencies, architecture, or branching data/control flow | Nodes and labeled edges express topology. Numbered arrows map to a textual edge list. Author order controls placement, not execution order. |
| `sequence` | Who calls whom, in what order | Ordered messages between participants. `request` is solid, `response` dashed, `event` heavier; the transcript also names the kind. Self-messages are supported. |
| `state-machine` | What states exist and what event permits a transition | Exactly one `initial` state. Use `normal` and `terminal` for the others. Every transition label names its trigger or condition. A sequence is better for one particular run. |
| `code` | An algorithm, payload, diff, call tree, or exact syntax | Select a language label; content stays literal and is never executed. Use `pseudocode` or `text` when exact syntax would distract. No syntax highlighting is implied. |
| `file-tree` | Where responsibilities live | Relative slash-separated paths and short responsibility labels. Parents are inferred; an explicit parent entry can describe a directory. This is not a filesystem snapshot tool. |
| `math` | An equation with its meaning and conditions | Required `title`, bounded LaTeX-style `expression`, and plain-text `description`. See [math notation](math.md); not a full TeX compiler. |
| `bar-chart` | Compare supplied quantities on one shared unit | Nonnegative finite numbers, zero baseline, visible values, and an exact data table. Required `context` names the source and period or explicitly illustrative scope. |
| `image` | A screenshot, photograph, or other supplied visual evidence | Local PNG, JPEG, or WebP `src` relative to the JSON; meaningful `alt` is required. Use a caption for source and scope. |
| `metrics` | A few important magnitudes | Every value has context: units, period, denominator, source, or clearly marked illustrative scope. Do not invent measurements to fill a row. Optional `title`, labeled `status`, and `metadata` frame the readings; `caption` or `caption_md` supplies shared source or scope. |
| `checklist` | Actionable next steps or acceptance status | Use `done`, `todo`, or `blocked`; explain blockers. These are static statuses, not clickable task controls. |
| `anatomy` | How the parts of an identifier, command, or structured value contribute to its meaning | Supply ordered `parts`, each with `value`, `label`, and `detail`. Optional `emphasis: "accent"` highlights a part without replacing its explanation. Unlike a flow, this shows composition, not execution. |
| `annotated-code` | What each configuration fragment or code excerpt means | Supply `language` and ordered `rows`, each pairing literal `code` with `explanation_md`. Optional `tone: "warning"` adds a visible warning label; `note` is the default. Use ordinary `code` for a single uninterrupted listing. |
| `requirements` | Known constraints, settings, or specification fields | Each item has a `label`, `value`, and explanatory `detail_md`, which may list constraints as bullets. These are static reference cards, not form controls or capability claims. |
| `paired-pipeline` | How two paths compare stage by stage | Exactly two labeled `tracks` and ordered `stages`. Each stage gives one cell per track, plus an optional `connector` naming the handoff to the next stage; the last stage has none. Use it when the stages genuinely align, such as an existing path beside a proposed one. A `comparison` suits unordered differences; a `flow` suits one branching path. |
| `questions` | Decisions or evidence gaps that remain open | Each item has a `question` and `context_md` explaining why it matters or what would resolve it. Use evidence blocks for established findings, not these cards. |
| `glossary` | Terms whose meaning the reader needs | Define only unfamiliar or domain-specific terms; place it near first use or at the end. |

## Composition

For a module teardown, a useful path is conclusion → capabilities → boundary/flow → behavior →
evidence → implications. For a concept, start with the distinction, then an example and its
consequences. For a comparison, state the decision criterion before showing alternatives. For a
walkthrough, organize around meaningful stages. These are possible shapes, not required blocks.

Keep each visual next to the explanation or evidence it supports. Use descriptive headings so
navigation reads like an outline of the argument. A section marker is not itself a content panel.
Avoid using status colors to imply a recommendation; the accompanying labels carry the meaning.

Use `anatomy` to unpack syntax, `annotated-code` to explain consequential lines, `requirements`
to collect established constraints, and `paired-pipeline` to put a path that already exists beside
one that does not. Finish with `questions` only when real decisions remain. Titles are required on
these five blocks. Keep examples labeled as examples rather than implying live readings.

## Captions

`table`, `code`, `flow`, `sequence`, `state-machine`, `anatomy`, `annotated-code`, `metrics`,
`requirements`, `questions`, `image`, `bar-chart`, `math`, and `paired-pipeline` each accept a footer below the figure: plain
text as `caption`, or the safe Markdown grammar below as `caption_md`. Supply one or the other;
a block carrying both is rejected. Use the footer for shared scope, source, or a qualification
that applies to the whole figure, not for a second explanation of it.

## Horizontal bar charts

Use `bar-chart` for one series of comparable, nonnegative quantities. Supply `title`, `unit`,
`context`, and 1–20 `items`, each with a unique meaningful `label` and numeric `value`:

```json
{
  "type": "bar-chart",
  "title": "Requests by outcome",
  "unit": "requests",
  "context": "Illustrative only: synthetic batch of 100 requests, not observed traffic.",
  "items": [
    { "label": "Cache", "value": 72 },
    { "label": "Origin", "value": 28 },
    { "label": "Failed", "value": 0 }
  ]
}
```

Every bar starts at zero and uses the same linear scale, ending at the largest supplied value.
The longest bar is not automatically 100 percent of a total. For percentages, supply percentages
as values, use `%` as the unit, and identify the denominator in `context`. Author order is preserved;
there are no hidden sorting, axis overrides, second axes, or color-only categories. Zero values
have no filled bar but retain their labels and exact values. An all-zero series remains valid.

**Never invent quantities to make a chart look complete.** Chart structure cannot verify truth.
For real observations, name the source, collection period, unit, and relevant denominator in
`context` or a shared caption. If measurements are unavailable, use an `evidence` block with
`unknown`, not fabricated bars. Label synthetic data explicitly as illustrative, never measured.

SVG labels show each value with its unit. A labeled semantic data table preserves the same values
for screen readers, narrow screens, and print; print uses the table instead of the drawing.
Long charts scroll horizontally on narrow screens rather than shrinking text. Split large
comparisons by reader question. Optional `caption` or `caption_md` follows the shared caption rule.

## Images

Use `{ "type": "image", "src": "screenshots/settings.png", "alt": "Settings panel with offline mode enabled" }`.
Optional `title`, `caption`, or `caption_md` adds context. Describe what matters in the image;
whitespace-only alt text is rejected. Identify the source and label synthetic examples.

Only image `src` paths are read. They resolve relative to the real input JSON directory, not the
working directory. Use slash-separated relative paths without empty, dot, parent, backslash,
colon, or control characters. Symlinks may point within that directory, never outside it.
Files must be regular PNG, JPEG, or WebP files; media types are detected from their signatures.
SVG, URLs, and inline data URI inputs are not supported. Signatures do not prove that a file
decodes correctly, so inspect the rendered image. Each file is limited to 5 MiB and all embedded
occurrences together to 20 MiB, separate from the 2 MiB JSON limit. Base64 increases HTML size
by roughly a third. The resulting HTML embeds every image; it needs no source files at reading time.

`--validate` checks image availability, paths, format signatures, and budgets too. Missing or
invalid assets fail before output is written. Output cannot replace the JSON or any source image.
For the exported `render(document, { inputDirectory })`, pass the source directory explicitly
when image blocks are present; `validate(document)` alone checks structure, not the filesystem.
Images shrink to the reading width and print with their captions; keep captions concise enough
for one page and split oversized visual explanations.

## Metric snapshots

A `metrics` block can be a simple row or a full observation panel:

- `status`: `{ "label": "Running", "tone": "positive" }`. Tones are `positive`, `neutral`,
  `warning`, and `danger`. A dot accompanies the visible label, so color never carries status alone.
- `metadata`: plain-text header context, such as version, protocol, and collection time.
  It sits to the right on wide screens and wraps below when space is limited.
- Each item requires `label`, `value`, and `context`. Optional `source` displays an OID or other
  precise identifier in monospace beside the reading's explanatory context.
- `value` can remain a string or use a structured value:
  `{ "parts": [{ "value": "17", "unit": "d" }, { "value": "14", "unit": "h" }] }`.
  Units render smaller on the baseline. For multiple readings, add `"separator": "slash"`;
  the default is `"space"`. Parts and long values wrap rather than being clipped.
- A shared footer uses `caption` or `caption_md`, under the caption rule above.

Status describes the supplied observation, not a live connection or refresh mechanism.
Label synthetic readings as illustrative; include the source and collection time for real readings.

## Text and Markdown

Plain text fields are escaped literally. `_md` fields support:

- Paragraphs separated by a blank line; single newlines create line breaks.
- Unordered lists when every line of a paragraph starts with `- ` or `* `.
- Inline backtick code, `**strong**`, `*emphasis*`, and `[label](https://example.com)` links
  (HTTP and HTTPS only).
- Inline badges as `:badge[Needs evidence]{warning}`; see the rules below.
- Inline math between `\(` and `\)`, using the [documented notation subset](math.md).

This is a deliberately small grammar, not CommonMark. Inline formatting does not nest; link
labels are plain text. Use dedicated blocks for headings, tables, fenced code, diagrams, and
source locations. Unsupported syntax, raw HTML, Markdown image syntax, and non-HTTP links display literally.
Links are ordinary navigation and may leave the offline document when clicked; rendering itself
never fetches them. Link URLs containing spaces or parentheses are outside this grammar.

## Inline badges

Use `:badge[label]{tone}` in any `_md` field to put a short status beside the claim it qualifies.
Tones are exactly `neutral`, `positive`, `warning`, or `danger`. Labels are plain text, trimmed,
and limited to 1–40 characters on one source line. A label cannot contain `[` or `]`; a tone cannot
contain `}`. For example:

```json
{
  "type": "prose",
  "body_md": "Offline rendering is :badge[Supported]{positive}; live data is :badge[Out of scope]{neutral}."
}
```

Use meaningful labels such as `Needs evidence`, not color names or unexplained symbols. Tone adds
emphasis but never carries meaning alone. Badges neither verify a claim nor represent a live
connection. They are text, not buttons, filters, or screen-reader live announcements.

Labels do not contain nested formatting: `:badge[**Ready**]{positive}` prints the asterisks.
Code spans and plain fields keep badge syntax literal. Unknown tones, empty/overlong labels,
and malformed syntax are not accepted as badges. Complete unsupported badge expressions display
literally, including their labels. Nested badge/link-like labels stay literal as a whole. An unclosed badge-like run stays literal
through the end of its source line. Use ordinary text when a label needs brackets or
an explanation longer than a short phrase.

Short badges stay together; long labels wrap only when needed to fit the available width, with
no truncation or hidden tooltip. In print, a border and the full label remain without relying on
background colors. Badges work in paragraphs, lists, captions, and other existing Markdown fields;
they are not a new block type and take no arbitrary style or attribute options.

## Diagram and data contracts

IDs must be unique within each diagram; edges/messages must reference existing IDs. Flow IDs are
lowercase identifiers. The schema caps diagrams to keep them legible; use separate blocks for
separate questions rather than compressing a full system into one diagram. Graph labels and
sequence messages wrap automatically. Edge lists and sequence transcripts preserve relationships in reading order. A semantic node key
also exposes every label, detail, state kind, and unused participant to assistive technology.

Tables must have one cell per column. Tree paths must be unique, relative, and slash-separated,
with no empty, `.` or `..` segments. Tree and evidence paths are displayed, never read from disk.
The CLI has a 2 MiB input resource limit; split large reports into focused documents.

## Renderer behavior

HTML embeds all styling with no scripts, fonts, CDN, or runtime network dependency. System dark
mode is honored. Navigation and ordinary links work without JavaScript. Wide tables, diagrams, and
paired pipelines scroll inside labeled, keyboard-focusable regions. Anatomy segments wrap without
losing their labels; annotated code pairs stack on small screens and long code lines wrap, so those
excerpts add no extra landmark or tab stop. Print output includes the complete text
alternative; large diagrams use that alternative instead of shrinking the drawing to tiny text. The CLI rejects invalid input before creating or replacing
output. `--force` atomically replaces the selected output; failure leaves the previous file intact.
The package's schema evaluator supports the bundled schema vocabulary, not arbitrary schemas.

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
| `metrics` | A few important magnitudes | Every value has context: units, period, denominator, source, or clearly marked illustrative scope. Do not invent measurements to fill a row. |
| `checklist` | Actionable next steps or acceptance status | Use `done`, `todo`, or `blocked`; explain blockers. These are static statuses, not clickable task controls. |
| `glossary` | Terms whose meaning the reader needs | Define only unfamiliar or domain-specific terms; place it near first use or at the end. |

## Composition

For a module teardown, a useful path is conclusion → capabilities → boundary/flow → behavior →
evidence → implications. For a concept, start with the distinction, then an example and its
consequences. For a comparison, state the decision criterion before showing alternatives. For a
walkthrough, organize around meaningful stages. These are possible shapes, not required blocks.

Keep each visual next to the explanation or evidence it supports. Use descriptive headings so
navigation reads like an outline of the argument. A section marker is not itself a content panel.
Avoid using status colors to imply a recommendation; the accompanying labels carry the meaning.

## Text and Markdown

Plain text fields are escaped literally. `_md` fields support:

- Paragraphs separated by a blank line; single newlines create line breaks.
- Unordered lists when every line of a paragraph starts with `- ` or `* `.
- Inline backtick code, `**strong**`, `*emphasis*`, and `[label](https://example.com)` links
  (HTTP and HTTPS only).

This is a deliberately small grammar, not CommonMark. Inline formatting does not nest; link
labels are plain text. Use dedicated blocks for headings, tables, fenced code, diagrams, and
source locations. Unsupported syntax, raw HTML, images, and non-HTTP links display literally.
Links are ordinary navigation and may leave the offline document when clicked; rendering itself
never fetches them. Link URLs containing spaces or parentheses are outside this grammar.

## Diagram and data contracts

IDs must be unique within each diagram; edges/messages must reference existing IDs. Flow IDs are
lowercase identifiers. The schema caps diagrams to keep them legible; use separate blocks for
separate questions rather than compressing a full system into one diagram. Graph labels and
sequence messages wrap automatically. Edge lists and sequence transcripts preserve relationships in reading order. A semantic node key
also exposes every label, detail, state kind, and unused participant to assistive technology.

Tables must have one cell per column. Tree paths must be unique, relative, and slash-separated,
with no empty, `.` or `..` segments. Paths are displayed, never read from disk.
The CLI has a 2 MiB input resource limit; split large reports into focused documents.

## Renderer behavior

HTML embeds all styling with no scripts, fonts, CDN, or runtime network dependency. System dark
mode is honored. Navigation and ordinary links work without JavaScript. Wide tables/diagrams
scroll inside labeled, keyboard-focusable regions. Print output includes the complete text
alternative; large diagrams use that alternative instead of shrinking the drawing to tiny text. The CLI rejects invalid input before creating or replacing
output. `--force` atomically replaces the selected output; failure leaves the previous file intact.
The package's schema evaluator supports the bundled schema vocabulary, not arbitrary schemas.

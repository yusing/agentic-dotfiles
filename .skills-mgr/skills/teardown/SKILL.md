---
name: teardown
description: Create structured visual explanations, module teardowns, comparisons, and walkthroughs as schema-validated JSON rendered to a standalone HTML file. Use when a topic benefits from a composed visual document rather than a brief inline sketch.
---

# Teardown

Make the idea understandable before making it decorative. Author content as JSON; let the
bundled renderer own the HTML, layout, and visual language. This is a standalone fork of
`show-me`; it does not require that skill.

## Compose

Read [the block guide](references/blocks.md) to select the form that explains the current
question, then [the schema](schema.json) for the exact allowed fields. For a complete runnable
composition, consult [the showcase](examples/showcase.json) when an example would help.

Lead with the answer or the distinction the reader needs. Follow with only the structure,
behavior, comparisons, and evidence needed to understand it. Choose document `type` by purpose;
block types are reusable across all document kinds. A small explanation may need only two blocks.

Use a narrow prose measure for the argument and dedicated blocks for dense detail: `anatomy`
unpacks structured values, `annotated-code` pairs snippets with explanations, `requirements`
collects known constraints, `paired-pipeline` aligns two paths stage by stage, and `questions`
exposes unresolved decisions. For observation panels, use the metric snapshot fields in the block
guide: labeled status, header metadata, structured values with units, source identifiers, and a
shared explanatory footer. Record collection time for real observations; label illustrative
readings explicitly. Figures take a footer as plain `caption` or Markdown `caption_md`, never both.

Ground claims in the supplied material or inspected sources. Separate observation, inference,
and unresolved questions. Keep hypothetical examples visibly labeled. Capability status means
what the evidence establishes, not what the agent assumes. Record precise evidence locations;
the renderer neither verifies them nor resolves evidence paths. Use concise, conversational phrasing
and meaningful titles rather than an obligatory template or an inventory of everything inspected.

Write a UTF-8 `.json` file satisfying `schema_version: "1.0"`. Content fields contain plain text
unless named `_md`; their limited Markdown grammar is in the block guide. Express diagrams through
nodes and edges, not HTML, SVG, Mermaid, CSS, or executable code. Code shown for explanation belongs
in a `code` block. Keep secret values out of both the document and its source labels.

Use inline `:badge[label]{tone}` sparingly in Markdown when a short status belongs beside a claim.
Follow the [badge rules](references/blocks.md#inline-badges): a meaningful plain label, one of four
tones, and no implied live state. Color reinforces the label; it does not replace evidence.

For algorithm notation, read [math notation](references/math.md) before writing inline `\(...\)`
or an equation `math` block. Use only the supported subset, define symbols, and give each block a
meaningful description. Keep unsupported syntax in literal code rather than implying it typesets.

For quantities, use `bar-chart` with supplied nonnegative values, a shared unit, and source/period
or illustrative scope in `context`. Read the [chart contract](references/blocks.md#horizontal-bar-charts).
Never invent data to fill a chart; use unknown evidence when measurements are missing. The renderer
supplies a zero baseline and a labeled data table for accessible reading and print.

For screenshots or photographs, use an `image` block with a relative local `src` and meaningful
`alt`. Read the [image contract](references/blocks.md#images) before selecting source files;
only those explicit image paths are read and embedded. Label illustrative images and cite real
image sources in captions. Markdown image syntax remains literal.

## Render and check

Use Node.js 22 or newer. Run the bundled helper through the available skill manager, or directly
from the skill folder if using a copied package:

```sh
skills-mgr run teardown/scripts/render.mjs /absolute/path/explanation.json -o /absolute/path/explanation.html
# Direct equivalent, with the installed skill folder as the working directory:
node scripts/render.mjs /absolute/path/explanation.json -o /absolute/path/explanation.html
```

The output directory must already exist. The renderer validates before writing; fix reported
field errors rather than relaxing the schema. `--validate` checks JSON and image assets without rendering.
Existing output is protected; use a new filename, or `--force` only when replacing that artifact
is within the user's request. Input JSON is never a valid output target.

Inspect the generated HTML for the actual content: reading order, crowded labels, evidence
placement, and narrow-screen readability. Split overloaded diagrams or tables by the idea they
explain. Finish with links to the HTML and its source JSON and a brief description, not a second
full prose rendition. If the user requests JSON only, return just the valid document and omit the
rendering step. Preserve their requested output location and opening behavior.

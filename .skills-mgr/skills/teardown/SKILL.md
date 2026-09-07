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

Ground claims in the supplied material or inspected sources. Separate observation, inference,
and unresolved questions. Keep hypothetical examples visibly labeled. Capability status means
what the evidence establishes, not what the agent assumes. Record precise evidence locations;
the renderer neither verifies them nor resolves file paths. Use concise, conversational phrasing
and meaningful titles rather than an obligatory template or an inventory of everything inspected.

Write a UTF-8 `.json` file satisfying `schema_version: "1.0"`. Content fields contain plain text
unless named `_md`; their limited Markdown grammar is in the block guide. Express diagrams through
nodes and edges, not HTML, SVG, Mermaid, CSS, or executable code. Code shown for explanation belongs
in a `code` block. Keep secret values out of both the document and its source labels.

## Render and check

Use Node.js 22 or newer. Run the bundled helper through the available skill manager, or directly
from the skill folder if using a copied package:

```sh
skills-mgr run teardown/scripts/render.mjs /absolute/path/explanation.json -o /absolute/path/explanation.html
# Direct equivalent, with the installed skill folder as the working directory:
node scripts/render.mjs /absolute/path/explanation.json -o /absolute/path/explanation.html
```

The output directory must already exist. The renderer validates before writing; fix reported
field errors rather than relaxing the schema. `--validate` checks JSON without rendering.
Existing output is protected; use a new filename, or `--force` only when replacing that artifact
is within the user's request. Input JSON is never a valid output target.

Inspect the generated HTML for the actual content: reading order, crowded labels, evidence
placement, and narrow-screen readability. Split overloaded diagrams or tables by the idea they
explain. Finish with links to the HTML and its source JSON and a brief description, not a second
full prose rendition. If the user requests JSON only, return just the valid document and omit the
rendering step. Preserve their requested output location and opening behavior.

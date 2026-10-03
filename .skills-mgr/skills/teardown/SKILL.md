---
name: teardown
description: Create structured visual explanations, module teardowns, comparisons, and walkthroughs as schema-validated JSON rendered to a standalone HTML file. Use when a topic benefits from a composed visual document rather than a brief inline sketch.
disable-model-invocation: true
---

# Teardown

Explain the requested idea as schema-validated JSON; the bundled renderer owns HTML and layout.
This standalone fork of `show-me` does not need that skill. A small explanation may need two blocks.

## Compose

Read [blocks.md](references/blocks.md) for block selection and Markdown rules, then [schema.json](schema.json)
for exact fields. Consult [showcase.json](examples/showcase.json) only when a runnable example helps.

Lead with the answer or needed distinction. Include only explanatory structure, comparisons, and
evidence. Document `type` describes purpose, not a fixed template. Ground claims in supplied or
inspected sources; distinguish observation, inference, unknowns, and illustrative examples.
Evidence locations are labels: the renderer neither verifies nor resolves them. Keep secrets out.

Write UTF-8 JSON with `schema_version: "1.0"`. Fields are plain text unless named `_md`. Use nodes
and edges for diagrams, not raw HTML/SVG/Mermaid/CSS/executable code. Explanatory code stays literal
in a `code` block. Titles should explain the content, not inventory the investigation.

Consult the relevant contract before adding these forms:

- [Math](references/math.md): bounded notation, defined symbols, meaningful descriptions.
- [Charts](references/blocks.md#horizontal-bar-charts): supplied nonnegative values, shared units,
  source/period or illustrative context; missing measurements are not invented data.
- [Images](references/blocks.md#images): explicit relative local assets and meaningful alt text;
  only selected `src` paths are embedded. Cite real sources and label synthetic images.
- [Badges](references/blocks.md#inline-badges): sparse meaningful labels, not implied live status.

Metric snapshots, captions, composition patterns, accessibility, and field limits belong to the
block guide; use only those needed for the explanation.

## Render and check

Use Node.js 22+ through the skill manager, or from a copied skill folder:

```sh
skills-mgr run teardown/scripts/render.mjs /absolute/path/explanation.json -o /absolute/path/explanation.html
# Direct equivalent from the skill folder:
node scripts/render.mjs /absolute/path/explanation.json -o /absolute/path/explanation.html
```

The output directory must exist. Validation precedes writing; fix field errors, not the schema.
`--validate` checks JSON and image assets without rendering. Input JSON cannot be the output.
Use a new filename or `--force` only for authorized replacement.

Inspect HTML reading order, labels, evidence placement, and narrow-screen readability. Split
crowded figures by idea. Deliver HTML and source-JSON links with a short description, not another
full prose rendition. For JSON-only requests omit rendering. Honor output location/opening choices.

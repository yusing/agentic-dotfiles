# Frontend

A project's design guide (such as a `DESIGN.md` beside its UI) and its established component kit own
the visual and interaction decisions for the surfaces they cover: tokens, spacing, alignment,
components, and control patterns. The skills below fill only what the guide and kit leave open; when
a skill's advice conflicts with them, follow the project. Generic taste applied to an established
app replaces its conventions with averages, which is the slop a guide exists to prevent.

Use applicable visual direction before building or redesigning a page. Consult technical guidance
when it can change an implementation decision; defer finished-UI review until there is a UI to
review. Explicit review requests keep their scope.

| Concern | Owning skill |
| --- | --- |
| Visual direction where no project guide or kit decides it: style, palette, typography, spacing, layout, and the rendered-look check in a browser | `design-taste-frontend`, for sites and their pages. No skill owns screens people work in (dashboards, lists, detail views, editors); match the surrounding design there |
| Interaction states (loading, empty, error, disabled), accessibility, responsive behavior, stack-specific implementation, and reviewing finished UI code for them | `ui-ux-pro-max` |

Where `design-taste-frontend` applies, it decides visual tokens. Take colours, typefaces, and
spacing from its dealt style, overriding default model font lists and `ui-ux-pro-max` style,
palette, or font recommendations, so they never compete for the same decision.

For component-only changes, match the surrounding design.

Prefer elevation and visual separation without borders or large gaps.

## Reviewable states

Make every condition a UI can show reachable on its own, so the user and agents can review and
live-edit it without clicking through the app, running a backend, or mocking the network. Use
Storybook's Component Story Format (CSF), the industry standard for this; choose another CSF tool
only when Storybook does not support the project's stack or build versions.

- Drive what a component renders from props. When state, data fetching, or API calls decide which
  condition shows, split a container that owns them from a presentational view that receives each
  condition as a prop; a condition reachable only through interaction cannot be a story.
- Write one story per real condition (loading, empty, error, each mode, each step of a flow), named
  for the condition, with args editable through Controls. Supply data as fixtures at the story
  boundary, such as a seeded query cache, rather than as network mocks.
- Run stories as render tests in the project's test command (Storybook's Vitest addon), so reviewed
  states are tested states, and enable Storybook's MCP addon so agents can list and preview them.
- Check a state by opening its story (a story URL carrying `args` and `globals`, or the MCP addon)
  rather than by scripting clicks through the app.
- Update a condition's stories in the change that adds or alters it. Set Storybook up when starting
  a web UI project; in an existing project without it, set it up with the first task that builds or
  restructures a component with conditional states. A small fix does not trigger the setup.

## Unaccepted UI approaches

- Refresh buttons: Keep displayed data up to date automatically; do not make users click to refresh.
- "Load More": Loading should be automatic when near the edge.
- "Loading" text: Use skeleton to represent loading instead.
- Periodic fetch (polling): UI states should be server-pushed, not client pulled.
- UI clutter: small secondary text scattered across a screen, sentences that describe what the
  screen is or is not ("These are", "are not", "does not"), and unsolicited lists of what the app
  does not require or support. Use one body text size.
- Implementation details in the UI: internal names, pipeline stages, and data-source mechanics.

## Content discipline

- Center each screen on the user's task, data, and actions. Do not turn implementation notes,
  validation caveats, or absent features into prominent UI sections.
- A result view states what happened, how well or badly it went, and why, with the supporting
  evidence beside it. Figures alone leave the user to work that out.
- Put detailed methodology and assumptions behind a clearly named disclosure or documentation
  link. Keep material limitations visible beside the affected result, stated briefly.
- Place explanations at the relevant interaction: file-handling information by the file picker,
  metric definitions by the metric, and errors by the failed action.
- Size sections to their content and importance. A report name or one-line status belongs in a
  compact row, not a large introductory panel.

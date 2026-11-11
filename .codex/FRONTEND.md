# Frontend

A project's design guide (such as a `DESIGN.md` beside its UI) and its established component kit own
the visual and interaction decisions for the surfaces they cover: tokens, spacing, alignment,
components, and control patterns. The skills below fill only what the guide and kit leave open; when
a skill's advice conflicts with them, follow the project. Generic taste applied to an established
app replaces its conventions with averages, which is the slop a guide exists to prevent.

Each remaining concern has one owning skill. During construction, use the project guide and kit;
defer automatic visual-design and UI best-practice skill loading until a working UI path exists. Explicit design
or quality-review tasks and user-invoked skills follow their requested operation. A change that
leaves a concern alone skips its skill.

| Concern | Owning skill |
| --- | --- |
| Visual direction where no project guide or kit decides it: style, palette, typography, spacing, layout, and the rendered-look check in a browser | `design-taste-frontend`, for sites and their pages. No skill owns screens people work in (dashboards, lists, detail views, editors); match the surrounding design there |
| Interaction states (loading, empty, error, disabled), accessibility, responsive behavior, stack-specific implementation, and reviewing finished UI code for them | `ui-ux-pro-max` |

Where `design-taste-frontend` applies, it decides visual tokens. Take colours, typefaces, and
spacing from its dealt style, not from `ui-ux-pro-max` style, palette, or font recommendations, so
the two never compete for the same decision.

For component-only changes, match the surrounding design.

## Unaccepted UI approaches

- "Load More": Loading should be automatic when near the edge.
- "Loading" text: Use skeleton to represent loading instead.
- Periodic fetch (polling): UI states should be server-pushed, not client pulled.
- Descriptive texts everywhere: Let the layout express itself. It is wrong if it can't.

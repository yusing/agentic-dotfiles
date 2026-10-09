# Interactive developer tool or TUI workbench README guide

## Reader and promise

Write for a developer deciding whether the tool improves their everyday workflow,
then trying it on a real project. This includes editors, IDEs, interactive terminal
workbenches, and coding-agent frontends such as Mekugi. Shell installation does not
make the command line the primary experience.

## Possible reader path

1. Concrete workflow benefit and supported host or environment
2. Screenshot or short demo showing the main interaction and result
3. Distinctive capabilities that help readers judge fit
4. Installation, credentials, and launch in a project
5. First useful task and the visible result
6. Everyday interaction, review, session continuity, and configuration
7. Integration limits, permissions, data handling, and recovery where relevant
8. Links to detailed controls, extension APIs, troubleshooting, and contributing

## Evidence to gather

For affected claims, inspect the main interaction, launch requirements, supported
hosts and providers, visible controls, generated changes, and recovery behavior.
Distinguish what the human does from what an agent or host does on their behalf.
Explain which permissions and state the tool owns or inherits when this affects use.

## Fit checks

Demonstrate a workflow, not a flag catalog or pane inventory. Explain what the
developer can accomplish and how they see or verify the result. Keep agent-facing
tool references separate from human onboarding. Use UI terms the reader can
actually see.

## Observed examples

- [OpenCode](https://github.com/anomalyco/opencode#readme) places a terminal
  screenshot before installation, explains the visible agent choices, and links
  detailed configuration and agent behavior to documentation. Borrow the product
  preview and human-facing role explanation. Its several clients and extensive
  installer choices do not imply that another tool has those same alternatives.
- [Lazygit](https://github.com/jesseduffield/lazygit#readme) demonstrates workflows
  with concrete actions, visible results, and short videos, then links full
  keybindings and configuration. Borrow the action-to-result explanations rather
  than copying its sponsor-heavy opening or exhaustive installation list.

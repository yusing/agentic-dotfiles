export const VERSION = "1.0.0";

export function deny(
  reason: string,
  eventName = "PreToolUse",
): Record<string, unknown> {
  return {
    hookSpecificOutput: {
      hookEventName: eventName,
      permissionDecision: "deny",
      permissionDecisionReason: reason,
    },
  };
}

export function additionalContext(
  context: string,
  eventName: string,
): Record<string, unknown> {
  return {
    hookSpecificOutput: {
      hookEventName: eventName,
      additionalContext: context,
    },
  };
}

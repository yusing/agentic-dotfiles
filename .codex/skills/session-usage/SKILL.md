---
name: session-usage
description: Meter a Codex session in the terminal for per-agent tokens, command time, and estimated API USD.
disable-model-invocation: true
---

# Session usage

Give the user a copy-paste command for their terminal. Do not run the script. Do not transcribe its tables.

Current session:

```bash
skills-mgr run session-usage/scripts/session_usage.py --thread-id THREAD_ID
```

Fill `--thread-id` with the id the user named, or with `CODEX_THREAD_ID` from the agent environment (`printenv CODEX_THREAD_ID` if it is not already in context). Put that value in the command; the user's shell will not have this variable. For a rollout file, pass `--session-file PATH` instead.

Completion: the user has that command. They run it. The script renders the report in their terminal and writes `~/.cache/session-usage/<thread-id>.md`.

If they ask for a number from the report, give the command again rather than reconstructing tables.

The script includes `main` and spawned subagent rollouts. It queries OpenRouter for list API prices and falls back to a hardcoded table. That is not a ChatGPT/Codex subscription rate.

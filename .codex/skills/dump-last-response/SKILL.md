---
name: dump-last-response
description: Save the exact assistant final response that precedes this skill invocation, without regenerating or repeating its text.
disable-model-invocation: true
---

# Dump Last Response

Use the bundled script. Do not reconstruct, quote, or manually write the response.

```bash
skills-mgr run dump-last-response/scripts/dump_last_response.py OUTPUT
```

The script finds the session whose filename contains `CODEX_THREAD_ID`, uses the latest `dump-last-response` skill injection as the boundary, and atomically writes the exact concatenated `output_text` bytes from the preceding assistant `final_answer`. Assistant responses produced while collecting the output path are after that boundary and are excluded.

- Pass `-` as `OUTPUT` only when exact stdout is explicitly requested.
- Pass `--overwrite` only when the user authorized replacing an existing file. An incomplete destination supplied for completion counts as authorization.
- Pass `--session FILE` only for diagnostics or an explicitly selected session.
- Do not add headings, fences, or a trailing newline.
- Report the output path and the script's byte count. Do not repeat the dumped response.

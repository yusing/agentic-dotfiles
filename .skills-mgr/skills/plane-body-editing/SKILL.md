---
name: plane-body-editing
description: Edit existing Plane issue descriptions with small cached JavaScript or local-file patches instead of re-emitting full bodies.
---

# Plane body editing

Plane replaces `description_html` as a whole. Keep the complete body in tool-side
state and emit only the edit, rather than regenerating unchanged content in model
output. This workflow is for description edits, not title/status-only updates.

## Choose the editing surface

- Prefer cached JavaScript for short, precise replacements and a few insertions.
  It avoids file transfers and full-paragraph patch context.
- Use a private local HTML file for substantial restructuring, editor work or a
  change whose ordinary diff is easier to inspect. Create it with `mktemp -d`
  outside the repository; retain the original body and revision alongside it.
- When code-mode caching is unavailable, use the local-file route with the
  available file and API tools. Neither route requires an API credential dump or
  a new helper service.

## Acquire one authoritative baseline

Discover the available Plane tool schema and unwrap its actual result envelope.
Fetch the issue once with its ID, project, `updated_at` and `description_html`.
In sparse fieldsets the project field is `project`, not `project_id`.

Keep an immutable fetched baseline and one editable body. Do not reconstruct a
later update from an older section array or parallel draft. After a successful
save, use the server-returned canonical body and revision as the next baseline.
Session caches are conveniences, not durable storage across context/session loss.

In a code-mode runtime exposing `store`, `load` and the Plane MCP tool:

```js
const response = await tools.mcp__plane__workitem({
  action: "retrieve_by_identifier",
  workitem_identifier: "PROJECT-123",
  fields: "id,project,updated_at,description_html",
});
if (response.isError) throw new Error("Issue retrieval failed");
const issue = response.structuredContent?.result ??
  JSON.parse(response.content.find(c => c.type === "text").text);
if (!issue.id || !issue.project || !issue.updated_at ||
    typeof issue.description_html !== "string") {
  throw new Error("Incomplete issue baseline");
}
store("plane-edit", {
  id: issue.id, projectId: issue.project, updatedAt: issue.updated_at,
  baseline: issue.description_html, body: issue.description_html,
});
text({ id: issue.id, characters: issue.description_html.length });
```

Print only needed excerpts or structural/changed-region summaries. Do not print
the entire retrieval/update response, which may duplicate the body in text and
structured envelopes.

## Cached JavaScript edits

Require the intended match count before changing text. A missing or ambiguous
anchor needs a narrower excerpt and corrected patch, not a blind replacement.

```js
const edit = load("plane-edit");
if (!edit) throw new Error("Missing cached baseline");
const before = "Exact existing phrase";
const after = "Replacement phrase";
const at = edit.body.indexOf(before);
if (at < 0 || edit.body.indexOf(before, at + before.length) >= 0) {
  throw new Error("Expected exactly one match");
}
edit.body = edit.body.slice(0, at) + after +
  edit.body.slice(at + before.length);
store("plane-edit", edit);
text({ replacements: 1 });
```

Escape newly inserted plain text for its HTML context. Preserve existing markup,
links, attributes, entities and code blocks; do not round-trip the body through
Markdown or globally normalize whitespace to make comparisons pass.

## Local-file edits

1. Dump the cached body and baseline metadata programmatically through stock
   file tools. Construct tool arguments from the cached value; do not copy the
   full body into a newly authored model message. Use private file permissions.
   If shell transport is needed, quote data as shell operands; JSON encoding alone
   is not shell escaping.
2. Inspect only the relevant ranges and edit the HTML with ordinary patching.
   Minified bodies may need a readable staging copy. Add line boundaries only
   where HTML structure permits them, preserving inline/preformatted whitespace.
3. Review the focused diff. Patch tools can add a final newline; distinguish that
   formatting change from the requested edit and preserve the original policy
   when byte identity matters.
4. Read the edited file into the code-mode tool result and consume it directly as
   the update value, without printing it through `text`. Check exit/completion and
   transfer integrity. A JSON envelope with a final completeness marker detects
   truncated transport; larger bodies need bounded chunks with verified offsets
   and complete reconstruction. Never upload a truncated read.

Keep the baseline separate from the editable file. Scratch copies may contain
private issue content; exclude them from repository history and remove only the
known owned files after successful verification when no recovery copy is needed.

## Submit and verify

1. Compare the staged body with its baseline. Skip a no-op update.
2. Immediately before upload, retrieve the issue's current `updated_at` using a
   sparse fieldset. If it differs, fetch the new body and reconcile/reapply the
   intended patch before proceeding. Do not overwrite the newer body with the
   cached draft. A timestamp preflight reduces stale writes but is not atomic
   compare-and-swap; use a revision precondition if the actual API exposes one.
3. Send only the authorized changed fields. For a body-only edit:

   ```js
   const edit = load("plane-edit");
   const result = await tools.mcp__plane__workitem({
     action: "update", project_id: edit.projectId, workitem_id: edit.id,
     description_html: edit.body,
   });
   // Check result.isError, unwrap and verify; do not print the full result.
   ```

   This call is the final step after the revision check, not a standalone
   unguarded update. Do not send `description_stripped` alongside the HTML.
4. Verify the saved description from the response, or retrieve it if absent.
   Accept only understood server normalization, such as editor attributes;
   compare affected structure, links and code as well as prose. Stripping all
   tags is not sufficient validation. Unexplained differences need inspection.
5. Replace the cached baseline/body/revision with the verified server result.
   Report only the issue identity, changed fields and verification outcome.

The full body still travels to the API. The savings come from avoiding repeated
model generation and full response display, not from a partial-update endpoint.
Offline editing/transport checks do not prove that a live update was saved.

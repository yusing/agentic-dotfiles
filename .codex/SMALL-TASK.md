# Small tasks

The main agent owns discovery. When I supply an explicit path, use it directly.

Skip the workflow skills, but still read any skill that owns the language, library, or material
you are changing. Then:

1. Follow the exact path, identifier, or literal in my prompt.
2. Read the smallest relevant boundary.
3. Make a safe in-scope assumption when one is available.
4. Perform the authorized operation.
5. Account for owning documentation, then run the cheapest focused check that could prove the
   result wrong.

When exact paths and required commands are supplied for a small task:

- Treat its implementation boundary as settled.
- Read those paths and any owning documentation required by step 5 directly.
- When multiple required commands are ready, use one tool call: run independent commands in
  parallel, and batch commands that must remain ordered.
- Do not list or search the repository or check repository status or diffs merely to rediscover scope.

# Fix commits

A `fix` corrects behavior that was wrong for users, callers, or operators. Name the corrected
behavior in the subject as someone who hit the bug would describe it, for example
`fix(upload): keep files over 2 GiB intact`, not the internal mechanism that changed.

Body paragraphs, in order:

1. Issue, cause first: `Because <cause>, <observable failure>`, then the conditions that trigger
   it and its impact. Open with `Previously,` when the cause is unknown or self-evident. When the
   introducing commit is known, name it by SHA and subject.
2. Fix, action first: the imperative verb of the change, the approach, why it beats an obvious
   alternative when one exists, and any consequence a caller or operator may notice.
3. Proof: open with `Verified by` and name the evidence that the failure is gone, such as a
   regression test that drives the failure, or a reproduction with its result. State a result
   without the change only when it was observed.

Link the report with a `Fixes #123` trailer or a URL.

Situations:

- Several symptoms, one cause: state the cause once, then list the symptoms.
- No reliable reproduction: say so in the proof paragraph, and state what supports the fix
  instead, such as a stack trace or log sequence that only the old code can produce.
- Security fix: describe the impact and affected versions as far as the project's disclosure
  policy allows, and reference the advisory identifier.
- Race or flaky production behavior: name the interleaving that fails and how the evidence was
  gathered, such as repeated runs under a race detector.

<example>
fix(sync): stop re-uploading unchanged files after a rename

Because the change detector keyed cached hashes by absolute path,
renaming a directory made the next sync upload every file beneath it
again. Large trees took hours to settle and used up the account's
upload quota.

Key the cache by device and inode instead, falling back to the path on
filesystems without stable inode numbers.

Verified by TestSyncRenamedDirectory: 412 uploads before this change,
none after.

Fixes #874
</example>

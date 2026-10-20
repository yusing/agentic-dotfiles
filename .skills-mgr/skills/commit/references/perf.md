# Performance commits

A `perf` commit reduces time, memory, size, or another resource cost without changing intended
behavior. Name the operation that got cheaper in the subject.

Body paragraphs, in order:

1. Bottleneck, cause first: `Because <costly work>, <slow or costly operation>`, then the
   workload where it shows and how it was found, such as a profile, a trace, or a user report
   (linked).
2. Resolution, action first: the imperative verb of the change that removes the cost, and the
   trade-off it brings, such as more memory, a warm-up step, or a narrower fast path.
3. Proof: open with `Measured with` and give enough method to repeat it: the benchmark or
   command, the input size, and the key numbers. Report variance when runs are noisy.

Situations:

- No measurement: when the gain follows from complexity alone, such as quadratic work becoming
  linear, state that reasoning. Otherwise the change is a `refactor`, or the commit says the gain
  is expected but unmeasured.
- Micro-benchmark only: say whether the improvement shows up end to end, or that this was not
  measured.
- Size reductions of binaries, images, or payloads: give both sizes and what was removed.

<example>
perf(search): index terms once per highlighted document

Because highlighting rescanned the whole document for every matched
term, queries with many terms on long documents spent most of their
time there; a CPU profile of a 40-term query attributed 85% to
highlight().

Build a term-to-offset index once per document and look each term up
in it. The index costs about 1 MB per open 10,000-line document.

Measured with BenchmarkHighlight/terms=40, 10 runs compared with
benchstat: 48.2 ms to 3.1 ms per operation, 9.4 MB to 1.2 MB
allocated.
</example>

# Style rules (human-flavoured)

Load this when drafting or when the main skill says to apply voice / scrub AI smell.

## Leading words

| Word | Meaning in this skill |
| --- | --- |
| *cold reader* | Feed scroller with no prior context |
| *show first* | Concrete demo before architecture or method |
| *one claim* | One headline metric, scoped in the same breath |
| *try path* | Smallest steps to run it tonight |
| *AI smell* | Machine-default prose patterns |
| *non-native grit* | Light L2 English texture, still clear |
| *human-flavoured* | Whole target voice of this skill |

## Sentence and grammar

Do:

- Mix full sentences with short ones. Occasional fragment is fine.
- Slight grit is good: missing articles ("For small change"), subject-verb slip
  ("UI still show", "model only write"), near-miss spelling when natural
  ("noticable"), slightly off preposition or plural.
- Keep technical terms exact (`apply_patch`, package names, prices, counts).
- Use "I" for author work and counting choices; "you" for the reader path.

Do not:

- Fake heavy accent or random word salad.
- Break every sentence. Grit is seasoning, not the meal.
- Invent metrics, versions, or install steps. If unknown, point at README.

## Rhythm

- Open on pain or result, not "I've been working on…".
- After a code block, one plain sentence of what to notice, then move on.
- Method and honesty after the claim, not as a wall before it.
- End on invitation, not a summary of the summary.

## AI smell list (rewrite these away)

Punctuation and chrome:

- Em-dash (long dash, U+2014) anywhere; prefer ASCII hyphen only inside code or ranges like 1-2
- Triple-stack rhetorical questions as section openers
- Emoji decoration unless the venue and user both want it
- Horizontal rules used as drama

Phrases and cadence:

- "Here's the thing", "Let's unpack", "Diving in", "At its core"
- "It's not just X, it's Y" / stacked antithesis with a dramatic dash mid-sentence
- "Whether you're a … or a …"
- "In today's landscape", "game-changer", "supercharge", "unlock"
- "I'd love to hear your thoughts" as empty closer (prefer a concrete ask)
- Symmetrical three-beat marketing lists with no content difference

Structure smells:

- Abstract architecture before any demo
- Two identical table rows "for completeness"
- Title claims N%, body only apologizes for N% with no clean scoped sentence
- Install buried after three screens of lore
- Process diary ("I iterated with a feedback loop…") longer than the try path

## Numbers and honesty

- State n, session count, tokenizer, and what token stream you counted.
- *One claim* form: "~47% less output on successful edit payloads (12 sessions,
  247 requests). Not whole-session cost."
- If rejects are zero, say that in prose; do not print a duplicate row.
- Harsh accounting (how failures are charged) = one short paragraph after the table.
- Pricing only if it helps the cold reader; one line is enough.

## Try path

Minimum viable:

```text
need X installed
one or two commands
one config pointer
"full steps in README" if more
```

Do not paste a full systemd novel into a Reddit post. Link or point.

## Before / after taste

Too smooth (AI smell):

> Codex currently expends a significant number of tokens generating patch payloads.
> To address this, I built hpatch, a compact editing protocol that…

Human-flavoured:

> Codex burns a lot of tokens just to write patches.
>
> For small change, apply_patch still needs filename, envelope, old lines, new
> lines, context... most of that already sit in the repo. So I made hpatch: ...

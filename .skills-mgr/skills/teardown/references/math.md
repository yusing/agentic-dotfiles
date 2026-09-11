# Math notation

Use math to clarify an algorithm or relationship, not as decoration. Define unfamiliar symbols
in nearby prose. The renderer typesets a bounded LaTeX-style subset as native MathML, with no
browser scripts, external fonts, dependencies, or math evaluation. This is not a TeX compiler.

## Inline expressions

In any `_md` field, surround an expression with `\(` and `\)`: `Cost is \(O(n^2)\).`
JSON escapes each backslash, so the source field is:

```json
{ "type": "prose", "body_md": "Cost is \\(O(n^2)\\)." }
```

Inline expressions must fit on one source line. As with the rest of the small Markdown grammar,
formatting does not nest. Backtick code spans remain literal. Dollar signs are ordinary text,
so prices are not mistaken for formulas. Unsupported or malformed inline notation displays
literally rather than turning an otherwise readable paragraph into a rendering error.

## Equation blocks

For an equation that deserves its own explanation, use `math`:

```json
{
  "type": "math",
  "title": "Arithmetic mean",
  "expression": "\\mu = \\frac{1}{n}\\sum_{i=1}^{n} x_i",
  "description": "Add the n values and divide by n, where n must be positive."
}
```

`title`, `expression`, and a meaningful plain-text `description` are required. A description
explains the operation and any conditions, not merely how to pronounce symbols. Optional
`caption` or `caption_md` follows the shared caption rule. Malformed block notation fails
validation with the expression field path; the CLI leaves an existing output untouched.

## Supported notation

| Notation | Meaning |
| --- | --- |
| `x`, `n`, `3.14`, `α` | Identifiers and numbers; ordinary Latin/Greek letters can be typed directly. |
| `+ - = < > ( ) [ ] \| , ; ! / : .` | Literal operators and delimiters. Use `\frac` for a stacked fraction. |
| `{x + y}` | Group an expression. Braces group but are not printed. |
| `x_i`, `x^2`, `x_i^2` | Subscripts, superscripts, or both. |
| `x^{12}` | Braces make a multi-character script; `x^12` means x to the first power, followed by 2. |
| `\frac{a}{b}` | Numerator over denominator. Both arguments require braces. |
| `\sqrt{x}`, `\sqrt[3]{x}` | Square root or indexed root. The radicand requires braces. |
| `\text{otherwise}` | Upright plain text. No nested braces or commands inside it. |
| `\sum_{i=1}^{n}`, `\prod_{i=1}^{n}`, `\int_0^1` | Sum, product, or integral with optional scripts. |
| `\sin`, `\cos`, `\tan`, `\log`, `\ln`, `\exp`, `\min`, `\max`, `\lim` | Upright function names. |

Greek commands: `alpha beta gamma delta epsilon zeta eta theta iota kappa lambda mu nu xi pi
rho sigma tau upsilon phi chi psi omega`, plus `Gamma Delta Theta Lambda Xi Pi Sigma Upsilon
Phi Psi Omega`. Prefix each with a backslash, such as `\theta`.

Operator commands: `times cdot div pm mp le leq ge geq ne neq approx equiv in notin subset
subseteq cup cap to rightarrow leftarrow Rightarrow infty ldots partial nabla forall exists
sum prod int`. Each maps to its usual visible mathematical symbol. Matching Unicode operator
symbols may also be typed directly.

Spaces separate tokens rather than setting layout. Empty groups, duplicate scripts on one base,
and unsupported commands are rejected in equation blocks. Expressions are limited to 2,000
characters, 1,000 atoms, and 24 nested levels. This bounds parser work, not mathematical complexity.
There are no macros, environments, matrices, alignment directives, arbitrary markup, file inputs,
or package commands. For unsupported notation, use a literal `code` block and explain it.

## Reading and print

Native MathML preserves fraction, root, and script structure for compatible browsers and
assistive technology. The original notation is retained as a MathML source annotation; an equation
block also exposes its human explanation as ordinary visible text. Support depends on the reader's
browser and assistive technology, so keep the explanation useful on its own.

Potentially wide equations can scroll horizontally in labeled keyboard-focusable regions without
overflowing the page. Short expressions remain ordinary semantic math, without extra tab stops. Short expressions typeset in print. A conservative length check prints long expressions as
wrapping notation source, with their description, rather than clipping or shrinking them into
unreadability. Split long equations at meaningful steps when their typeset form matters in print.

The generated structures follow [MathML Core](https://www.w3.org/TR/mathml-core/).

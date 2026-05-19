#!/usr/bin/env bash
# Generate a bespoke Gemini image prompt for a single blog article.
# Reads the article, asks Claude for ONE visual metaphor specific to it,
# and prints a single-line image prompt to stdout.
#
# Usage: ./gen-cover-prompt.sh <article-path>
# Requires: `claude` CLI on PATH

set -euo pipefail

ARTICLE_PATH="${1:?Usage: gen-cover-prompt.sh <article-path>}"
[ -r "$ARTICLE_PATH" ] || { echo "ERROR: cannot read $ARTICLE_PATH" >&2; exit 1; }

# Trim article to ~4K chars so the prompt stays small.
ARTICLE_EXCERPT="$(head -c 4000 "$ARTICLE_PATH")"

read -r -d '' INSTRUCTIONS <<'PROMPT' || true
You design cover images for a developer blog called "On-Chain Engineering".
You will be given the start of an article. Output ONE image-generation prompt
for Gemini, on a SINGLE line, no preamble, no quotes, no markdown.

GOAL
The prompt must describe ONE bespoke visual metaphor that fits THIS article
specifically. Do NOT default to "pills connected by arrows" or generic flow
diagrams — that style has been overused.

PICK ONE IDEA, NOT THREE
- The cover shows ONE thing, drawn well. Not a 3-panel exploded view, not
  "central element with three downstream icons", not a wall of stacked
  sub-diagrams.
- If the article has 3 ideas, pick the strongest one and make the cover
  about that. The other ideas live in the article, not the cover.
- A reader should be able to describe the image in ONE short sentence.

EVERY ELEMENT MUST MEAN SOMETHING
- No decorative dividers, no "thin line down the middle to separate trusted
  and untrusted", no floating caption text in whitespace, no ornamental
  borders.
- If you can't say "this line represents X in the article", don't draw it.
- Labels are allowed but optional — prefer zero or one short label
  (max 4 words). Never more than 3 labels total. No paragraphs.

METAPHOR INSPIRATION (pick the one that fits, or invent a better one)
- A stack frame, a Merkle branch, a sealed envelope, blob fragments,
  a vault door, a torn ticket, an opcode tape, a router with split paths,
  a hand-drawn schematic, a circuit board trace, a stamped receipt,
  a single highlighted row in a ledger, a time-lapse silhouette, a key
  turning in a lock, a single dial, a bridge, a sieve, a relay baton.

HOUSE STYLE (lock these in, verbatim phrasing fine)
- Dark navy background #0a0f1a with subtle dot grid pattern
- Flat vector illustration, NO gradients, NO glow, NO 3D, NO photorealism
- Accent color Ethernal blue #3D95CE used sparingly on the one element
  that matters most
- White or light-gray short labels only where they earn their place
- Centered composition, generous whitespace, 1424x752 landscape
- Polished editorial / Figma quality, not childish, not corporate clipart

OUTPUT
One line, plain text, ready to paste into the Gemini API. No quotes,
no markdown, no "Here is the prompt:". Just the prompt itself.
PROMPT

PROMPT_OUT=$(claude -p "$INSTRUCTIONS

---ARTICLE START---
$ARTICLE_EXCERPT
---ARTICLE END---" 2>/dev/null)

PROMPT_OUT=$(printf '%s' "$PROMPT_OUT" | tr '\n' ' ' | sed -E 's/[[:space:]]+/ /g; s/^ //; s/ $//')

if [ -z "$PROMPT_OUT" ]; then
  echo "ERROR: empty prompt from Claude" >&2
  exit 1
fi

printf '%s\n' "$PROMPT_OUT"

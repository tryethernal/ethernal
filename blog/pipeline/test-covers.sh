#!/usr/bin/env bash
# Local test runner: regenerate covers for a chosen set of articles into a
# sandbox dir so we can eyeball the new prompt without touching prod images.
#
# Usage:
#   ./test-covers.sh slug1 slug2 ...
#   ./test-covers.sh                # picks 4 recent articles
#
# Requires: GEMINI_API_KEY, `claude` CLI, imagemagick (magick).
# Outputs PNGs to blog/pipeline/test-covers-out/

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
CONTENT_DIR="$REPO_DIR/blog/src/content/blog"
OUT_DIR="$SCRIPT_DIR/test-covers-out"
mkdir -p "$OUT_DIR"

# If no slugs given, pick 4 recent articles.
if [ $# -eq 0 ]; then
  mapfile -t SLUGS < <(ls -t "$CONTENT_DIR"/*.md 2>/dev/null | head -4 | xargs -n1 basename | sed 's/\.md$//')
else
  SLUGS=("$@")
fi

echo "Testing covers for: ${SLUGS[*]}"
echo "Output dir: $OUT_DIR"
echo

for SLUG in "${SLUGS[@]}"; do
  ARTICLE="$CONTENT_DIR/$SLUG.md"
  if [ ! -r "$ARTICLE" ]; then
    echo "SKIP $SLUG — no article at $ARTICLE"
    continue
  fi
  echo "=== $SLUG ==="
  echo "1) generating bespoke prompt via Claude..."
  PROMPT=$("$SCRIPT_DIR/gen-cover-prompt.sh" "$ARTICLE")
  echo "   prompt: $PROMPT"
  echo "2) generating image via Gemini..."
  # Generate into sandbox: override IMG_DIR so we don't clobber prod images.
  TMP_SLUG="test-$SLUG"
  IMG_DIR_BACKUP="${IMG_DIR:-}"
  # generate-cover.sh writes to blog/public/images by default — we copy out after.
  "$SCRIPT_DIR/generate-cover.sh" "$TMP_SLUG" "$PROMPT" >/dev/null
  PROD_IMG="$REPO_DIR/blog/public/images/$TMP_SLUG.png"
  PROD_OG="$REPO_DIR/blog/public/images/$TMP_SLUG-og.png"
  if [ -f "$PROD_IMG" ]; then
    mv "$PROD_IMG" "$OUT_DIR/$SLUG.png"
    rm -f "$PROD_OG"
    echo "   -> $OUT_DIR/$SLUG.png"
  else
    echo "   FAILED"
  fi
  echo
done

echo "Done. Open $OUT_DIR/ to compare against blog/public/images/<slug>.png"

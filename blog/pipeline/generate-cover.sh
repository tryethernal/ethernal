#!/usr/bin/env bash
# Generate blog cover + OG images using Gemini API directly
# Usage: ./generate-cover.sh <slug> <prompt> [model]
# Requires: GEMINI_API_KEY env var, imagemagick (magick)
set -euo pipefail

SLUG="${1:?Usage: generate-cover.sh <slug> <prompt> [model]}"
PROMPT="${2:?Usage: generate-cover.sh <slug> <prompt> [model]}"
MODEL="${3:-gemini-3.1-flash-image-preview}"

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
IMG_DIR="$REPO_DIR/blog/public/images"
GEMINI_API_KEY="${GEMINI_API_KEY:?GEMINI_API_KEY must be set}"

mkdir -p "$IMG_DIR"

echo "Generating image with model: $MODEL"
echo "Prompt: $PROMPT"

# Try up to 3 times (Gemini can return text-only on first attempt)
for attempt in 1 2 3; do
  echo "Attempt $attempt..."

  RESPONSE=$(curl -s "https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${GEMINI_API_KEY}" \
    -H 'Content-Type: application/json' \
    -d "$(jq -n --arg prompt "$PROMPT" '{
      contents: [{
        parts: [{ text: $prompt }]
      }],
      generationConfig: {
        responseModalities: ["TEXT", "IMAGE"]
      }
    }')")

  # Extract base64 image data from response
  IMAGE_DATA=$(echo "$RESPONSE" | jq -r '.candidates[0].content.parts[] | select(.inlineData) | .inlineData.data // empty' 2>/dev/null | head -1)

  if [ -n "$IMAGE_DATA" ] && [ "$IMAGE_DATA" != "null" ]; then
    # Decode and save raw image
    RAW_IMG=$(mktemp /tmp/gemini-img-XXXXXX.png)
    echo "$IMAGE_DATA" | base64 -d > "$RAW_IMG"

    # Check file is actually an image and not tiny/corrupt
    RAW_SIZE=$(wc -c < "$RAW_IMG")
    if [ "$RAW_SIZE" -lt 10000 ]; then
      echo "Warning: Image too small ($RAW_SIZE bytes), retrying..."
      rm -f "$RAW_IMG"
      continue
    fi

    # Resize to cover (1424x752) and OG (1200x630)
    magick "$RAW_IMG" -resize 1424x752! "$IMG_DIR/${SLUG}.png"
    magick "$RAW_IMG" -resize 1200x630! "$IMG_DIR/${SLUG}-og.png"
    rm -f "$RAW_IMG"

    COVER_SIZE=$(wc -c < "$IMG_DIR/${SLUG}.png")
    OG_SIZE=$(wc -c < "$IMG_DIR/${SLUG}-og.png")
    echo "Done. Cover: ${COVER_SIZE} bytes, OG: ${OG_SIZE} bytes"
    echo "  $IMG_DIR/${SLUG}.png"
    echo "  $IMG_DIR/${SLUG}-og.png"
    exit 0
  fi

  # Log error details
  ERROR=$(echo "$RESPONSE" | jq -r '.error.message // empty' 2>/dev/null)
  if [ -n "$ERROR" ]; then
    echo "API error: $ERROR"
  else
    echo "No image in response (model may have returned text only)"
  fi

  sleep 2
done

echo "ERROR: Failed to generate image after 3 attempts"
exit 1

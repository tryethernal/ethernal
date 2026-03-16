#!/usr/bin/env bash
# Blog promo tweeter — posts a promo tweet for newly published blog articles
# Called from publish.sh or run standalone
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
ENV_FILE="/opt/blog-pipeline.env"
PROMPTS_DIR="$SCRIPT_DIR/prompts"
BLOG_DIR="$REPO_DIR/blog/src/content/blog"
IMAGE_DIR="$REPO_DIR/blog/public/images"
PROMOTED_FILE="$SCRIPT_DIR/.promoted-articles"
LOG_FILE="${PROMOTE_LOG_FILE:-/dev/stderr}"

log() { echo "[$(date -Iseconds)] [promote] $*" | tee -a "$LOG_FILE"; }

# Report failure to GitHub Issues
FAILURE_REPORTED=false
report_failure() {
  [ "$FAILURE_REPORTED" = true ] && return
  FAILURE_REPORTED=true
  local phase="$1"
  local log_tail
  log_tail=$(tail -50 "$LOG_FILE" 2>/dev/null || echo "No log available")
  local title="Blog promo tweet failed: $phase"

  gh issue create \
    --repo tryethernal/ethernal \
    --title "$title" \
    --label "tweet-pipeline" \
    --body "$(cat <<EOF
## Blog Promo Tweet Failure

**Phase:** $phase
**Date:** $(date -Iseconds)
**Log file:** \`$LOG_FILE\`

### Last 50 lines of log

\`\`\`
$log_tail
\`\`\`
EOF
)" 2>&1 | tee -a "$LOG_FILE" || log "WARNING: Failed to create GitHub issue"
}

trap 'report_failure "Unexpected error (line $LINENO)"' ERR

# Load environment (for standalone mode)
if [ -f "$ENV_FILE" ]; then
  set -a
  source "$ENV_FILE"
  set +a
fi

# Ensure we're in the right directory for Node.js imports
cd "$SCRIPT_DIR"

# Ensure promoted file exists
touch "$PROMOTED_FILE"

# Scan for published articles
PROMOTED=0
for ARTICLE in "$BLOG_DIR"/*.md; do
  [ -f "$ARTICLE" ] || continue

  # Check status: published
  STATUS=$(grep '^status:' "$ARTICLE" | head -1 | sed 's/^status: *//')
  if [ "$STATUS" != "published" ]; then
    continue
  fi

  # Extract slug
  SLUG=$(basename "$ARTICLE" .md)

  # Skip if already promoted
  if grep -qF "$SLUG" "$PROMOTED_FILE" 2>/dev/null; then
    continue
  fi

  # Skip if file modified less than 10 minutes ago (deploy race guard)
  FILE_MTIME=$(stat -c %Y "$ARTICLE" 2>/dev/null || stat -f %m "$ARTICLE" 2>/dev/null || echo "0")
  NOW=$(date +%s)
  AGE=$(( NOW - FILE_MTIME ))
  if [ "$AGE" -lt 600 ]; then
    log "Skipping $SLUG — published less than 10 min ago (age: ${AGE}s)"
    continue
  fi

  # Extract frontmatter fields
  TITLE=$(grep '^title:' "$ARTICLE" | head -1 | sed 's/^title: *"//;s/"$//')
  DESCRIPTION=$(grep '^description:' "$ARTICLE" | head -1 | sed 's/^description: *"//;s/"$//')

  log "Promoting: $TITLE ($SLUG)"

  # Generate curiosity-gap hook via Claude
  HOOK=""
  PROMPT=$(cat "$PROMPTS_DIR/promote-blog.md")
  HOOK=$(claude -p "${PROMPT}

Title: ${TITLE}
Description: ${DESCRIPTION}" \
    --dangerously-skip-permissions \
    --max-turns 3 \
    2>&1) || true

  # Fallback if Claude fails or returns empty
  if [ -z "$HOOK" ] || [ ${#HOOK} -gt 500 ]; then
    log "WARNING: Claude hook generation failed or too long — using description fallback"
    HOOK="$DESCRIPTION"
  fi

  # Build full tweet text
  BLOG_URL="https://tryethernal.com/blog/${SLUG}"
  TWEET_TEXT="${HOOK}

${BLOG_URL}"

  # Upload cover image if available (check .png, .webp, .jpg)
  COVER_IMAGE=""
  for EXT in png webp jpg; do
    if [ -f "$IMAGE_DIR/${SLUG}.${EXT}" ]; then
      COVER_IMAGE="$IMAGE_DIR/${SLUG}.${EXT}"
      break
    fi
  done

  MEDIA_ID=""
  if [ -n "$COVER_IMAGE" ]; then
    MEDIA_ID=$(COVER_IMAGE="$COVER_IMAGE" node --input-type=module -e "
      import { createTwitterClientFromEnv } from './lib/twitter.js';
      const client = createTwitterClientFromEnv();
      const mediaId = await client.uploadMedia(process.env.COVER_IMAGE);
      console.log(mediaId);
    " 2>&1) || true

    if [ -z "$MEDIA_ID" ] || echo "$MEDIA_ID" | grep -qi "error\|warning"; then
      log "WARNING: Media upload failed — posting without image"
      MEDIA_ID=""
    fi
  else
    log "WARNING: No cover image for $SLUG — posting without image"
  fi

  # Post the promo tweet
  if ! RESULT=$(TWEET_TEXT="$TWEET_TEXT" MEDIA_ID="$MEDIA_ID" node --input-type=module -e "
    import { createTwitterClientFromEnv } from './lib/twitter.js';
    const client = createTwitterClientFromEnv();
    const options = {};
    if (process.env.MEDIA_ID && process.env.MEDIA_ID !== '') {
      options.mediaId = process.env.MEDIA_ID;
    }
    const result = await client.postTweet(process.env.TWEET_TEXT, options);
    console.log(JSON.stringify({ tweetId: result.id }));
  " 2>&1); then
    log "ERROR: Failed to post promo tweet for $SLUG: $RESULT"
    report_failure "Post tweet for $SLUG"
    continue
  fi

  TWEET_ID=$(echo "$RESULT" | grep -o '"tweetId":"[^"]*"' | sed 's/"tweetId":"//;s/"//' || true)
  log "Posted promo tweet: $TWEET_ID"

  # Record as promoted
  echo "$SLUG" >> "$PROMOTED_FILE"

  # Keep promoted file bounded
  tail -200 "$PROMOTED_FILE" > "${PROMOTED_FILE}.tmp" && mv "${PROMOTED_FILE}.tmp" "$PROMOTED_FILE"

  # Send PostHog event
  if [ -n "${POSTHOG_API_KEY:-}" ] && [ -n "$TWEET_ID" ]; then
    curl -s -X POST https://us.i.posthog.com/capture/ \
      -H "Content-Type: application/json" \
      -d "$(jq -n \
        --arg api_key "$POSTHOG_API_KEY" \
        --arg tweetId "$TWEET_ID" \
        --arg slug "$SLUG" \
        '{
          api_key: $api_key,
          event: "twitter:blog_promoted",
          distinct_id: "tweet-pipeline",
          properties: { tweetId: $tweetId, slug: $slug }
        }')" > /dev/null 2>&1 || true
  fi

  PROMOTED=$((PROMOTED + 1))
done

if [ "$PROMOTED" -gt 0 ]; then
  log "Promoted $PROMOTED article(s)."
else
  log "No new articles to promote."
fi

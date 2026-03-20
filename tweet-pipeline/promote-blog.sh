#!/usr/bin/env bash
# Blog promo tweeter — posts a promo tweet for newly published blog articles
# Called from publish.sh or run standalone
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ENV_FILE="/opt/blog-pipeline.env"
PROMPTS_DIR="$SCRIPT_DIR/prompts"
LOG_DIR="/var/log/tweet-pipeline"
mkdir -p "$LOG_DIR"
LOG_FILE="${PROMOTE_LOG_FILE:-$LOG_DIR/promote-$(date +%Y%m%d-%H%M%S).log}"

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

# Scan for published articles via GitHub API
PROMOTED=0

# List blog markdown files from GitHub
BLOG_FILES=$(gh api repos/tryethernal/ethernal/contents/blog/src/content/blog \
  --jq '[.[] | select(.name | endswith(".md")) | .name] | .[]' 2>/dev/null) || {
  log "WARNING: Failed to list blog files from GitHub API"
  BLOG_FILES=""
}

while IFS= read -r FILENAME; do
  [ -z "$FILENAME" ] && continue
  # Fetch file content from GitHub API
  ARTICLE_CONTENT=$(gh api "repos/tryethernal/ethernal/contents/blog/src/content/blog/${FILENAME}" \
    --jq '.content' 2>/dev/null | tr -d '\n' | base64 -d 2>/dev/null) || continue

  # Check status: published
  STATUS=$(echo "$ARTICLE_CONTENT" | grep '^status:' | head -1 | sed 's/^status: *//')
  if [ "$STATUS" != "published" ]; then
    continue
  fi

  # Extract slug
  SLUG="${FILENAME%.md}"

  # Skip if already promoted
  if node lib/cli/is-promoted.js "$SLUG" 2>/dev/null; then
    continue
  fi

  # Skip if article is not live yet
  PAGE_TITLE=$(curl -sf "https://tryethernal.com/blog/${SLUG}" 2>/dev/null | grep -o '<title>[^<]*</title>' || true)
  if [ -z "$PAGE_TITLE" ] || echo "$PAGE_TITLE" | grep -q '^<title>On-Chain Engineering | On-Chain Engineering</title>$'; then
    log "Skipping $SLUG — not live at tryethernal.com yet"
    continue
  fi

  # Extract frontmatter fields
  TITLE=$(echo "$ARTICLE_CONTENT" | grep '^title:' | head -1 | sed 's/^title: *"//;s/"$//')
  DESCRIPTION=$(echo "$ARTICLE_CONTENT" | grep '^description:' | head -1 | sed 's/^description: *"//;s/"$//')

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

  # Detect Claude auth/API errors (would otherwise be posted as tweet text)
  if echo "$HOOK" | grep -qiE "authentication_error|Invalid authentication|Invalid.*token|Invalid API key|401.*error|403.*error|Not logged in|Please run /login"; then
    log "ERROR: Claude returned an auth/API error instead of a hook: $HOOK"
    report_failure "Claude auth error for $SLUG"
    continue
  fi

  # Fallback if Claude fails or returns empty
  if [ -z "$HOOK" ] || [ ${#HOOK} -gt 500 ]; then
    log "WARNING: Claude hook generation failed or too long — using description fallback"
    HOOK="${DESCRIPTION}

full article →"
  fi

  # Build full tweet text (hook already ends with transition phrase)
  BLOG_URL="https://tryethernal.com/blog/${SLUG}"
  TWEET_TEXT="${HOOK}
${BLOG_URL}"

  # Download cover image from live site
  COVER_IMAGE=""
  TMPIMG=$(mktemp /tmp/promo-cover-XXXXXX)
  for EXT in webp png jpg; do
    if curl -sf "https://tryethernal.com/blog/images/${SLUG}.${EXT}" -o "$TMPIMG"; then
      COVER_IMAGE="$TMPIMG"
      break
    fi
  done
  if [ -z "$COVER_IMAGE" ]; then
    rm -f "$TMPIMG"
  fi

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
  node lib/cli/mark-promoted.js "$SLUG"

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

  # Clean up temp cover image
  [ -n "$COVER_IMAGE" ] && rm -f "$COVER_IMAGE"

  PROMOTED=$((PROMOTED + 1))
done <<< "$BLOG_FILES"

if [ "$PROMOTED" -gt 0 ]; then
  log "Promoted $PROMOTED article(s)."
else
  log "No new articles to promote."
fi

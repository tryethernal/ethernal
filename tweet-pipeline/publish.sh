#!/usr/bin/env bash
# Tweet publisher — runs every 10 minutes via systemd timer
# Posts queued tweets that are past their scheduledAt time
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ENV_FILE="/opt/blog-pipeline.env"
LOG_DIR="/var/log/tweet-pipeline"
QUEUE_DIR="${TWEET_QUEUE_DIR:-/home/blog/tweet-queue}"

mkdir -p "$LOG_DIR"
LOG_FILE="$LOG_DIR/publish-$(date +%Y%m%d-%H%M%S).log"

log() { echo "[$(date -Iseconds)] $*" | tee -a "$LOG_FILE"; }

# Load environment
if [ -f "$ENV_FILE" ]; then
  set -a
  source "$ENV_FILE"
  set +a
  QUEUE_DIR="${TWEET_QUEUE_DIR:-/home/blog/tweet-queue}"
else
  log "ERROR: $ENV_FILE not found"
  exit 1
fi

# Verify Twitter credentials
if [ -z "${TWITTER_API_KEY:-}" ]; then
  log "ERROR: TWITTER_API_KEY not set"
  exit 1
fi

cd "$SCRIPT_DIR"

NOW=$(date +%s)
POSTED_COUNT=0

# Iterate over queued tweets
for TWEET_FILE in "$QUEUE_DIR"/tweet-*.json; do
  # Handle empty glob (no files match)
  [ -f "$TWEET_FILE" ] || continue

  # Skip already posted
  POSTED=$(jq -r '.posted' "$TWEET_FILE")
  if [ "$POSTED" = "true" ]; then
    continue
  fi

  # Skip if scheduledAt is in the future
  SCHEDULED_AT=$(jq -r '.scheduledAt' "$TWEET_FILE")
  SCHEDULED_EPOCH=$(date -d "$SCHEDULED_AT" +%s 2>/dev/null || date -j -f "%Y-%m-%dT%H:%M:%S" "${SCHEDULED_AT%%.*}" +%s 2>/dev/null || echo "0")
  if [ "$SCHEDULED_EPOCH" -gt "$NOW" ]; then
    log "Skipping $(basename "$TWEET_FILE") — scheduled for $SCHEDULED_AT (future)"
    continue
  fi

  log "Posting $(basename "$TWEET_FILE")..."

  # Post via Node.js
  if RESULT=$(TWEET_FILE="$TWEET_FILE" node --input-type=module -e "
    import { createTwitterClientFromEnv, formatThread } from './lib/twitter.js';
    import { readFileSync } from 'node:fs';

    const tweet = JSON.parse(readFileSync(process.env.TWEET_FILE, 'utf-8'));
    const client = createTwitterClientFromEnv();
    const thread = formatThread(tweet.hook, tweet.thread || []);

    let mediaId;
    if (tweet.imagePath && tweet.imagePath !== '') {
      try {
        mediaId = await client.uploadMedia(tweet.imagePath);
      } catch (err) {
        console.error('WARNING: Media upload failed:', err.message);
      }
    }

    const tweetIds = await client.postThread(thread, mediaId);
    console.log(JSON.stringify({ tweetIds }));
  " 2>&1); then
    # Extract the JSON line containing tweetIds (grep avoids picking up stray stderr)
    TWEET_IDS=$(echo "$RESULT" | grep -o '{"tweetIds":\[.*\]}' || true)
    if [ -z "$TWEET_IDS" ]; then
      log "ERROR: Could not extract tweetIds from output. Marking as failed to prevent duplicate post."
      jq '.postError = "no tweetIds in output"' "$TWEET_FILE" > "${TWEET_FILE}.tmp" && mv "${TWEET_FILE}.tmp" "$TWEET_FILE"
      continue
    fi
    log "Posted successfully: $TWEET_IDS"

    # Update queue file: mark as posted
    TMPFILE=$(mktemp)
    jq --argjson tweetIds "$TWEET_IDS" \
       --arg postedAt "$(date -Iseconds)" \
       '.posted = true | .tweetIds = $tweetIds.tweetIds | .postedAt = $postedAt' \
       "$TWEET_FILE" > "$TMPFILE" && mv "$TMPFILE" "$TWEET_FILE"

    # Send PostHog event for tracking
    if [ -n "${POSTHOG_API_KEY:-}" ]; then
      curl -s -X POST https://us.i.posthog.com/capture/ \
        -H "Content-Type: application/json" \
        -d "{
          \"api_key\": \"${POSTHOG_API_KEY}\",
          \"event\": \"twitter:tweet_posted\",
          \"distinct_id\": \"tweet-pipeline\",
          \"properties\": {
            \"tweetId\": $(echo "$TWEET_IDS" | jq '.tweetIds[0]'),
            \"bucket\": $(jq -r '.bucket' "$TWEET_FILE" | jq -R .),
            \"sourceId\": $(jq -r '.sourceId' "$TWEET_FILE" | jq -R .),
            \"hasThread\": $(jq 'if (.thread | length) > 0 then true else false end' "$TWEET_FILE")
          }
        }" > /dev/null 2>&1 || true
    fi

    POSTED_COUNT=$((POSTED_COUNT + 1))
  else
    log "ERROR: Failed to post $(basename "$TWEET_FILE"): $RESULT"
    # Continue to next tweet
    continue
  fi
done

log "Done. Posted $POSTED_COUNT tweet(s)."

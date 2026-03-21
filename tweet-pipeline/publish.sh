#!/usr/bin/env bash
# Tweet publisher — runs every 10 minutes via systemd timer
# Posts queued tweets that are past their scheduledAt time
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ENV_FILE="/opt/blog-pipeline.env"
LOG_DIR="/var/log/tweet-pipeline"
mkdir -p "$LOG_DIR"
LOG_FILE="$LOG_DIR/publish-$(date +%Y%m%d-%H%M%S).log"

log() { echo "[$(date -Iseconds)] $*" | tee -a "$LOG_FILE"; }

# Report failure to GitHub Issues with last 50 lines of log
FAILURE_REPORTED=false
report_failure() {
  [ "$FAILURE_REPORTED" = true ] && return
  FAILURE_REPORTED=true
  local phase="$1"
  local log_tail
  log_tail=$(tail -50 "$LOG_FILE" 2>/dev/null || echo "No log available")
  local title="Tweet publish failed: $phase"

  gh issue create \
    --repo tryethernal/ethernal \
    --title "$title" \
    --label "tweet-pipeline" \
    --body "$(cat <<EOF
## Tweet Publish Failure

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

# Load environment
if [ -f "$ENV_FILE" ]; then
  set -a
  source "$ENV_FILE"
  set +a
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

POSTED_COUNT=0
MIN_GAP_MINUTES=90

# Check time since last posted tweet to avoid back-to-back posting
LAST_POSTED=$(node --input-type=module -e "
  import { getDb } from './lib/db.js';
  const ts = getDb().getLastPostedAt();
  console.log(ts || '');
")

if [ -n "$LAST_POSTED" ]; then
  LAST_EPOCH=$(date -d "$LAST_POSTED" +%s 2>/dev/null || echo "0")
  NOW_EPOCH=$(date +%s)
  ELAPSED_MIN=$(( (NOW_EPOCH - LAST_EPOCH) / 60 ))
  if [ "$ELAPSED_MIN" -lt "$MIN_GAP_MINUTES" ]; then
    log "Last tweet posted ${ELAPSED_MIN}min ago (< ${MIN_GAP_MINUTES}min minimum gap) — skipping this cycle"
    # Still run promote-blog even when skipping tweet posting
    PROMOTE_LOG_FILE="$LOG_FILE" "$SCRIPT_DIR/promote-blog.sh" 2>&1 || log "WARNING: promote-blog.sh failed"
    log "Done. Posted 0 tweet(s) (gap throttle)."
    exit 0
  fi
fi

# Get pending tweets from DB
PENDING=$(node lib/cli/get-pending-tweets.js)
TWEET_COUNT=$(echo "$PENDING" | jq 'length')

if [ "$TWEET_COUNT" = "0" ]; then
  log "No pending tweets to publish."
else
  for i in $(seq 0 $((TWEET_COUNT - 1))); do
    # Only post one tweet per publish cycle to maintain spacing
    if [ "$POSTED_COUNT" -gt 0 ]; then
      REMAINING=$((TWEET_COUNT - i))
      log "Already posted 1 tweet this cycle — deferring $REMAINING remaining to next cycle"
      break
    fi

    TWEET=$(echo "$PENDING" | jq ".[$i]")
    TWEET_DB_ID=$(echo "$TWEET" | jq -r '.id')
    IMAGE_PATH=$(echo "$TWEET" | jq -r '.image_path // ""')

    log "Posting tweet id=$TWEET_DB_ID..."

    if RESULT=$(TWEET_JSON="$TWEET" node --input-type=module -e "
      import { createTwitterClientFromEnv, formatThread } from './lib/twitter.js';
      const tweet = JSON.parse(process.env.TWEET_JSON);
      const client = createTwitterClientFromEnv();
      const thread = formatThread(tweet.hook, JSON.parse(tweet.thread));

      let mediaId;
      if (tweet.image_path && tweet.image_path !== '') {
        try {
          mediaId = await client.uploadMedia(tweet.image_path);
        } catch (err) {
          console.error('WARNING: Media upload failed:', err.message);
        }
      }

      const tweetIds = await client.postThread(thread, mediaId);
      console.log(JSON.stringify({ tweetIds }));
    " 2>&1); then
      TWEET_IDS_RAW=$(echo "$RESULT" | grep -o '{"tweetIds":\[.*\]}' || true)
      TWEET_IDS=$(echo "$TWEET_IDS_RAW" | jq -c '.tweetIds' 2>/dev/null || true)
      if [ -z "$TWEET_IDS" ] || [ "$TWEET_IDS" = "null" ]; then
        log "ERROR: Could not extract tweetIds. Marking error."
        node --input-type=module -e "
          import { getDb } from './lib/db.js';
          getDb().setPostError(Number(process.argv[1]), 'no tweetIds in output');
        " "$TWEET_DB_ID" 2>/dev/null || true
        continue
      fi

      log "Posted successfully: $TWEET_IDS"
      node lib/cli/mark-posted.js "$TWEET_DB_ID" "$TWEET_IDS"

      # PostHog event
      if [ -n "${POSTHOG_API_KEY:-}" ]; then
        FIRST_TWEET_ID=$(echo "$TWEET_IDS" | jq -r '.[0]')
        BUCKET=$(echo "$TWEET" | jq -r '.bucket')
        SOURCE_ID=$(echo "$TWEET" | jq -r '.source_id')
        THREAD_JSON=$(echo "$TWEET" | jq -r '.thread')
        HAS_THREAD=$(echo "$THREAD_JSON" | jq 'if (length) > 0 then true else false end' 2>/dev/null || echo "false")

        curl -s -X POST https://us.i.posthog.com/capture/ \
          -H "Content-Type: application/json" \
          -d "$(jq -n \
            --arg api_key "$POSTHOG_API_KEY" \
            --arg tweetId "$FIRST_TWEET_ID" \
            --arg bucket "$BUCKET" \
            --arg sourceId "$SOURCE_ID" \
            --argjson hasThread "$HAS_THREAD" \
            '{
              api_key: $api_key, event: "twitter:tweet_posted",
              distinct_id: "tweet-pipeline",
              properties: { tweetId: $tweetId, bucket: $bucket, sourceId: $sourceId, hasThread: $hasThread }
            }')" > /dev/null 2>&1 || true
      fi

      POSTED_COUNT=$((POSTED_COUNT + 1))
    else
      log "ERROR: Failed to post tweet id=$TWEET_DB_ID: $RESULT"
      continue
    fi
  done
fi

# ============================================================
# Promote newly published blog articles
# ============================================================
PROMOTE_LOG_FILE="$LOG_FILE" "$SCRIPT_DIR/promote-blog.sh" 2>&1 || log "WARNING: promote-blog.sh failed"

log "Done. Posted $POSTED_COUNT tweet(s)."

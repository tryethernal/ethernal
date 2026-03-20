#!/usr/bin/env bash
# Twitter engagement metrics bridge — polls tweet metrics and sends to PostHog
# Runs daily via systemd timer
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ENV_FILE="/opt/blog-pipeline.env"
LOG_DIR="/var/log/tweet-pipeline"

mkdir -p "$LOG_DIR"
LOG_FILE="$LOG_DIR/engagement-$(date +%Y%m%d).log"

log() { echo "[$(date -Iseconds)] $*" | tee -a "$LOG_FILE"; }

# Load environment
if [ -f "$ENV_FILE" ]; then
  set -a; source "$ENV_FILE"; set +a
fi

cd "$SCRIPT_DIR"

# Collect tweet IDs from last 7 days (engagement settles after ~7 days)
TWEET_IDS=$(node lib/cli/get-tweet-ids.js 7)

if [ -z "$TWEET_IDS" ]; then
  log "No tweets to check engagement for."
  exit 0
fi

log "Checking engagement for tweet IDs: $TWEET_IDS"

# Get metrics and send to PostHog via Node.js
TWEET_IDS_CSV="$TWEET_IDS" POSTHOG_KEY="${POSTHOG_API_KEY:-}" node --input-type=module -e "
import { createTwitterClientFromEnv } from './lib/twitter.js';

const client = createTwitterClientFromEnv();
const allIds = process.env.TWEET_IDS_CSV.split(',').filter(Boolean);
const posthogKey = process.env.POSTHOG_KEY;

// Batch in chunks of 100
for (let i = 0; i < allIds.length; i += 100) {
  const batch = allIds.slice(i, i + 100);
  try {
    const metrics = await client.getMetrics(batch);
    for (const m of metrics) {
      console.log(JSON.stringify({
        tweetId: m.id,
        likes: m.metrics.likes,
        retweets: m.metrics.retweets,
        replies: m.metrics.replies,
        impressions: m.metrics.impressions
      }));

      // Send to PostHog
      if (posthogKey) {
        try {
          await fetch('https://us.i.posthog.com/capture/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              api_key: posthogKey,
              event: 'twitter:tweet_engagement',
              distinct_id: 'tweet-pipeline',
              properties: {
                tweetId: m.id,
                likes: m.metrics.likes,
                retweets: m.metrics.retweets,
                replies: m.metrics.replies,
                impressions: m.metrics.impressions
              }
            })
          });
        } catch (phErr) {
          console.error('PostHog delivery failed for', m.id, phErr.message);
        }
      }
    }
  } catch (err) {
    console.error('Error fetching metrics for batch:', err.message);
  }
}
" 2>&1 | tee -a "$LOG_FILE"

log "Engagement bridge complete."

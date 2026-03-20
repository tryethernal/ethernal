#!/usr/bin/env bash
# One-time backfill: fetch engagement metrics for ALL posted tweets and send to PostHog.
# Run manually once, then delete. Daily engagement-bridge.sh handles ongoing tracking.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ENV_FILE="/opt/blog-pipeline.env"

if [ -f "$ENV_FILE" ]; then
  set -a; source "$ENV_FILE"; set +a
fi

cd "$SCRIPT_DIR"

# Collect ALL posted tweet IDs (no date filter — 10 years covers everything)
TWEET_IDS=$(node lib/cli/get-tweet-ids.js 3650)

if [ -z "$TWEET_IDS" ]; then
  echo "No posted tweets found."
  exit 0
fi

COUNT=$(echo "$TWEET_IDS" | tr ',' '\n' | wc -l | tr -d ' ')
echo "Backfilling engagement for $COUNT tweet IDs..."

TWEET_IDS_CSV="$TWEET_IDS" POSTHOG_KEY="${POSTHOG_API_KEY:-}" node --input-type=module -e "
import { createTwitterClientFromEnv } from './lib/twitter.js';

const client = createTwitterClientFromEnv();
const allIds = process.env.TWEET_IDS_CSV.split(',').filter(Boolean);
const posthogKey = process.env.POSTHOG_KEY;

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
                impressions: m.metrics.impressions,
                backfill: true
              }
            })
          });
        } catch (phErr) {
          console.error('PostHog delivery failed for', m.id, phErr.message);
        }
      }
    }
  } catch (err) {
    console.error('Error fetching batch starting at index ' + i + ':', err.message);
  }
  // Rate limit: pause 2s between batches
  if (i + 100 < allIds.length) await new Promise(r => setTimeout(r, 2000));
}
"

echo "Backfill complete."

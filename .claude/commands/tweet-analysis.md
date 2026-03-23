---
description: Analyze tweet pipeline engagement metrics, identify top performers, and recommend content/frequency improvements
---

# Tweet Pipeline Engagement Analysis

Perform a comprehensive analysis of all tweets posted through the @tryethernal tweet pipeline, with engagement metrics and actionable recommendations.

## Step 1: Fetch All Tweet Data with Engagement Metrics

SSH into the Hetzner server and query the SQLite database for all posted tweets, then fetch their engagement metrics from the Twitter API.

```bash
ssh root@157.90.154.200 "cd /opt/tweet-pipeline && export \$(grep -E '^TWITTER_' /opt/blog-pipeline.env | xargs) && node --input-type=module -e \"
import { createTwitterClientFromEnv } from './lib/twitter.js';
import Database from 'better-sqlite3';

const db = new Database('state.db', { readonly: true });
const tweets = db.prepare('SELECT id, hook, bucket, slot, tweet_ids, posted_at, source_id FROM tweets WHERE posted = 1 ORDER BY id').all();

const client = createTwitterClientFromEnv();
const rootIds = tweets.map(t => JSON.parse(t.tweet_ids)[0]);

// Twitter API allows max 100 IDs per request
for (let i = 0; i < rootIds.length; i += 100) {
  const batch = rootIds.slice(i, i + 100);
  const metrics = await client.getMetrics(batch);

  for (const t of tweets) {
    const rootId = JSON.parse(t.tweet_ids)[0];
    const m = metrics.find(x => x.id === rootId);
    if (m) {
      const hook = t.hook.substring(0, 120).replace(/\n/g, ' ');
      console.log(JSON.stringify({
        id: t.id,
        bucket: t.bucket,
        slot: t.slot,
        posted_at: t.posted_at,
        source_id: t.source_id,
        hook: hook,
        impressions: m.metrics.impressions,
        likes: m.metrics.likes,
        retweets: m.metrics.retweets,
        replies: m.metrics.replies,
        engagement_rate: ((m.metrics.likes + m.metrics.retweets + m.metrics.replies) / Math.max(m.metrics.impressions, 1) * 100).toFixed(2)
      }));
    }
  }
}
db.close();
\""
```

## Step 2: Fetch Account Stats

```bash
ssh root@157.90.154.200 "cd /opt/tweet-pipeline && export \$(grep -E '^TWITTER_' /opt/blog-pipeline.env | xargs) && node --input-type=module -e \"
import { TwitterApi } from 'twitter-api-v2';
const api = new TwitterApi({
  appKey: process.env.TWITTER_API_KEY,
  appSecret: process.env.TWITTER_API_SECRET,
  accessToken: process.env.TWITTER_ACCESS_TOKEN,
  accessSecret: process.env.TWITTER_ACCESS_SECRET,
});
const me = await api.v2.me({ 'user.fields': 'public_metrics' });
console.log(JSON.stringify(me.data));
\""
```

## Step 3: Check Current Pipeline Config

```bash
# Current bucket config
cat tweet-pipeline/config.js | head -20

# Current timer schedule
cat tweet-pipeline/tweet-draft.timer

# Count tweets in last 7 days vs 30 days
ssh root@157.90.154.200 "cd /opt/tweet-pipeline && node --input-type=module -e \"
import Database from 'better-sqlite3';
const db = new Database('state.db', { readonly: true });
const now = new Date();
const d7 = new Date(now - 7*24*60*60*1000).toISOString();
const d30 = new Date(now - 30*24*60*60*1000).toISOString();
const last7 = db.prepare('SELECT count(*) as n FROM tweets WHERE posted = 1 AND posted_at >= ?').get(d7);
const last30 = db.prepare('SELECT count(*) as n FROM tweets WHERE posted = 1 AND posted_at >= ?').get(d30);
const total = db.prepare('SELECT count(*) as n FROM tweets WHERE posted = 1').get();
console.log(JSON.stringify({ last7: last7.n, last30: last30.n, total: total.n }));
db.close();
\""
```

## Step 4: Analyze and Present

Parse all collected data and present a structured analysis report. Include:

### Report Format

```
## Tweet Pipeline Engagement Report

**Account:** @tryethernal | **Followers:** [N] | **Period:** [date range] | **Total tweets analyzed:** [N]

### Summary Metrics
| Metric | Value |
|--------|-------|
| Avg impressions/tweet | X |
| Avg likes/tweet | X |
| Avg retweets/tweet | X |
| Total engagement (likes+RTs+replies) | X |
| Best impression count | X |
| Best like count | X |

### Top 5 by Impressions
| # | Impr | Likes | RTs | Bucket | Hook (truncated) |
|---|------|-------|-----|--------|-------------------|

### Top 5 by Engagement (likes + RTs)
| # | Likes | RTs | Impr | Bucket | Hook (truncated) |
|---|-------|-----|------|--------|-------------------|

### Performance by Bucket
| Bucket | Count | Avg Impr | Avg Likes | Total RTs | Avg Eng Rate |
|--------|-------|----------|-----------|-----------|--------------|

### Performance by Slot (time of day)
| Slot | Count | Avg Impr | Avg Likes | Best Tweet |
|------|-------|----------|-----------|------------|

### Performance by Day of Week
| Day | Count | Avg Impr | Avg Likes |
|-----|-------|----------|-----------|

### Week-over-Week Trend
| Week | Tweets | Avg Impr | Avg Likes | Avg RTs | Notes |
|------|--------|----------|-----------|---------|-------|

### Content Pattern Analysis
Analyze which CONTENT patterns correlate with higher engagement:
- Hooks starting with dollar amounts vs percentages vs counts
- Hooks with contrarian framing ("hot take", "unpopular opinion") vs news-style
- Tweets mentioning specific projects (@tags) vs generic
- Thread length (hook only vs 2-3 replies vs 4+ replies)
- Tweets with images vs without

### Recommendations
Based on the data, provide:
1. **Frequency:** Is current posting frequency optimal? Should it increase/decrease?
2. **Timing:** Which time slots perform best? Should schedule change?
3. **Content mix:** Which buckets should get more/fewer slots?
4. **Hook patterns:** What hook styles should the prompts emphasize more?
5. **Specific prompt changes:** If any patterns are clear, suggest exact prompt edits
6. **Growth tactics:** What's missing beyond just tweet content?
```

## Important Notes

- All SSH commands use `root@157.90.154.200`
- Tweet pipeline is at `/opt/tweet-pipeline/`
- Env file is at `/opt/blog-pipeline.env` (do NOT cat it)
- The `replies` count often includes the bot's own thread replies (subtract 1 for organic replies if tweet has a thread)
- Tweets bulk-posted at the same timestamp were a backlog flush, not normal operation. Note this in the analysis.
- Display all times in CET (Central European Time). Server uses UTC.
- Compare current metrics against the last analysis if a previous report exists in memory.

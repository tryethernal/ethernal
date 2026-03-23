---
description: Dashboard showing marketing pipeline health (blog drafting, tweet pipeline, promo tweets, engagement tracking)
---

# Marketing Pipeline Status

Show a comprehensive operational overview of the marketing pipeline running on the Hetzner server (`157.90.154.200`). This covers: tweet drafting, tweet publishing, blog promo tweets, blog drafting, and engagement tracking.

**Server:** `root@157.90.154.200`, repo at `/opt/ethernal-blog-stack`, env at `/opt/blog-pipeline.env`

## Step 1: Collect All Data (run ALL SSH commands in parallel)

```bash
# 1. Timer status — all marketing timers
ssh root@157.90.154.200 "systemctl list-timers | grep -E 'tweet|blog|newsletter'"

# 2. Recent tweet draft logs (last 24h)
ssh root@157.90.154.200 "journalctl -u tweet-draft.service --since '24 hours ago' --no-pager 2>&1 | tail -80"

# 3. Recent tweet publish logs (last 6h)
ssh root@157.90.154.200 "journalctl -u tweet-publish.service --since '6 hours ago' --no-pager 2>&1 | tail -60"

# 4. Recent blog draft logs (last 72h, runs every 2 days)
ssh root@157.90.154.200 "journalctl -u blog-draft.service --since '72 hours ago' --no-pager 2>&1 | tail -80"

# 5. Tweet queue — last 10 files with content
ssh root@157.90.154.200 "for f in \$(ls -t /home/blog/tweet-queue/tweet-*.json 2>/dev/null | head -10); do echo '=== '\$(basename \$f)' ==='; cat \$f | jq '{posted, scheduledAt, postedAt, bucket, hook: .hook[:80]}'; done"

# 6. Failed services in last 48h
ssh root@157.90.154.200 "journalctl --since '48 hours ago' --no-pager -p err -u tweet-draft.service -u tweet-publish.service -u blog-draft.service -u tweet-engagement.service -u scan-newsletter.service 2>&1 | tail -30"

# 7. Git status on server (dirty files = potential pull failures)
ssh root@157.90.154.200 "cd /opt/ethernal-blog-stack && git status --porcelain && echo '---' && git log --oneline -3"

# 8. Open pipeline GitHub issues
gh issue list --repo tryethernal/ethernal --label "tweet-pipeline" --label "blog-pipeline" --state open --limit 10 2>/dev/null || echo "No open pipeline issues"

# 9. Disk usage of queue and logs
ssh root@157.90.154.200 "du -sh /home/blog/tweet-queue/ /var/log/tweet-pipeline/ /var/log/blog-pipeline/ 2>/dev/null"

# 10. Promoted articles tracker
ssh root@157.90.154.200 "echo '--- Last 5 promoted ---' && tail -5 /opt/ethernal-blog-stack/tweet-pipeline/.promoted-articles 2>/dev/null || echo 'No promoted articles file'"
```

## Step 2: Analyze and Display

Parse all collected data and present a dashboard. Use the format below.

### Display Format

```
## Marketing Pipeline Dashboard

### Timers
| Timer | Status | Last Run | Next Run | Last Result |
|-------|--------|----------|----------|-------------|
| tweet-draft | active/inactive | timestamp | timestamp | success/failed |
| tweet-publish | active/inactive | timestamp | timestamp | success/failed |
| tweet-engagement | active/inactive | timestamp | timestamp | success/failed |
| blog-draft | active/inactive | timestamp | timestamp | success/failed |
| scan-newsletter | active/inactive | timestamp | timestamp | success/failed |

### Tweet Pipeline (last 24h)
- **Drafted:** N tweets
- **Posted:** N tweets
- **Pending:** N tweets (list scheduledAt times)
- **Failed:** N (list errors if any)

**Latest posted tweet:**
> [hook text, truncated to ~100 chars]
> Posted: [timestamp] | Bucket: [bucket] | Tweet ID: [id]

**Next scheduled draft:** [time from timer]

### Blog Promo
- **Last promoted:** [slug] on [date]
- **Unpromoted published articles:** [list any published articles not in .promoted-articles]

### Blog Drafting
- **Last run:** [timestamp]
- **Result:** success/failed
- **Topic:** [extracted from logs]
- **Next run:** [from timer]

### Errors & Warnings (last 48h)
List any:
- Service failures (non-zero exit)
- git pull failures
- Claude API errors
- Twitter API errors
- Image generation failures
- Any journalctl error-level entries

If none: "No errors in the last 48h."

### Server Health
- **Git status:** clean / dirty (list files if dirty)
- **Server HEAD:** [commit hash, should match origin/develop]
- **Disk usage:** queue size, log sizes
- **Open pipeline issues:** [count] ([list titles if any])

### Action Items
Flag anything that needs attention:
- Timer inactive? → "Timer X is not running"
- Tweets not posting (queued but not posted for >30 min past scheduledAt)? → "Tweet publishing may be stuck"
- Git dirty on server? → "Server has uncommitted changes — risk of git pull failures in promote-blog.sh"
- Blog draft failed? → "Blog draft pipeline failed — check logs"
- No tweets drafted in 24h? → "Tweet drafting may be stuck"
- Disk usage > 1GB for any dir? → "Consider cleaning old logs/queue files"
- HEAD behind origin/develop? → "Server is behind — run git pull"
```

## Important Notes

- All SSH commands use `root@157.90.154.200`
- Queue files are at `/home/blog/tweet-queue/`
- Logs are at `/var/log/tweet-pipeline/` and `/var/log/blog-pipeline/`
- Env file is at `/opt/blog-pipeline.env` (do NOT cat it — contains secrets)
- Repo checkout is at `/opt/ethernal-blog-stack`
- The `tweet-publish` timer runs every 10 min — a few "Posted 0 tweets" is normal
- Blog promo runs inside `publish.sh` — check its logs for promo-specific output
- **Display all times in CET (Central European Time, UTC+1 / CEST UTC+2).** The server and logs use UTC — convert all timestamps to CET before displaying in the dashboard.

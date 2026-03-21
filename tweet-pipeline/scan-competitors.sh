#!/usr/bin/env bash
# Competitor monitor — searches Reddit for block explorer mentions, scores via Claude
# Runs every 3 days at 10:00 UTC via systemd timer, before slot 3 draft at 15:00 UTC
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ENV_FILE="/opt/blog-pipeline.env"
PROMPTS_DIR="$SCRIPT_DIR/prompts"
LOG_DIR="/var/log/tweet-pipeline"

mkdir -p "$LOG_DIR"
LOG_FILE="$LOG_DIR/competitors-$(date +%Y%m%d-%H%M%S).log"

log() { echo "[$(date -Iseconds)] $*" | tee -a "$LOG_FILE"; }

# Report failure to GitHub Issues
FAILURE_REPORTED=false
report_failure() {
  [ "$FAILURE_REPORTED" = true ] && return
  FAILURE_REPORTED=true
  local phase="$1"
  local log_tail
  log_tail=$(tail -50 "$LOG_FILE" 2>/dev/null || echo "No log available")
  local title="Competitor monitor failed: $phase"

  gh issue create \
    --repo tryethernal/ethernal \
    --title "$title" \
    --label "tweet-pipeline" \
    --body "$(cat <<EOF
## Competitor Monitor Failure

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
  report_failure "Environment"
  exit 1
fi

log "Starting competitor monitor scan..."

cd "$SCRIPT_DIR"

# ============================================================
# Reddit search configuration
# ============================================================
SUBREDDITS="ethereum ethdev optimism arbitrum layer2"
QUERIES=(
  "blockscout"
  "routescan"
  "etherscan alternative"
  "block explorer"
  "explorer for L2"
  "explorer for rollup"
  "need block explorer"
  "self-host explorer"
  "whitelabel explorer"
)

# Age cutoff: 3 days
CUTOFF_EPOCH=$(date -d "3 days ago" +%s 2>/dev/null || date -v-3d +%s)
UA="Ethernal-CompetitorMonitor/1.0"

# ============================================================
# Fetch Reddit posts
# ============================================================
log "Searching Reddit..."

ALL_POSTS=""
SEEN_IDS=""
POST_COUNT=0

for SUB in $SUBREDDITS; do
  for QUERY in "${QUERIES[@]}"; do
    # URL-encode query (pass via argv to avoid shell quoting issues)
    ENCODED_QUERY=$(python3 -c "import sys,urllib.parse; print(urllib.parse.quote(sys.argv[1]))" "$QUERY")

    # Use PullPush API (free Reddit archive, no auth needed, works from datacenter IPs)
    RESPONSE=$(curl -sf \
      -H "User-Agent: $UA" \
      "https://api.pullpush.io/reddit/search/submission/?q=${ENCODED_QUERY}&subreddit=${SUB}&after=3d&size=10&sort=desc&sort_type=score" \
      2>/dev/null) || {
      log "WARNING: PullPush returned error for r/$SUB q='$QUERY' — retrying in 10s"
      sleep 10
      RESPONSE=$(curl -sf \
        -H "User-Agent: $UA" \
        "https://api.pullpush.io/reddit/search/submission/?q=${ENCODED_QUERY}&subreddit=${SUB}&after=3d&size=10&sort=desc&sort_type=score" \
        2>/dev/null) || {
        log "WARNING: PullPush retry failed for r/$SUB q='$QUERY' — skipping"
        sleep 3
        continue
      }
    }

    # Extract posts: filter by age, score, and dedup
    # PullPush returns data directly in .data[] (not .data.children[].data like Reddit API)
    POSTS=$(echo "$RESPONSE" | SEEN_IDS_ENV="$SEEN_IDS" CUTOFF_ENV="$CUTOFF_EPOCH" python3 -c "
import sys, json, os
cutoff = int(os.environ.get('CUTOFF_ENV', '0'))
seen = set(os.environ.get('SEEN_IDS_ENV', '').split())
data = json.load(sys.stdin)
for d in data.get('data', []):
    pid = d.get('id', '')
    if pid in seen:
        continue
    if d.get('created_utc', 0) < cutoff:
        continue
    if d.get('score', 0) < 2:
        continue
    seen.add(pid)
    print(json.dumps({
        'id': pid,
        'title': d.get('title', ''),
        'selftext': (d.get('selftext', '') or '')[:2000],
        'subreddit': d.get('subreddit', ''),
        'score': d.get('score', 0),
        'num_comments': d.get('num_comments', 0),
        'url': 'https://www.reddit.com' + d.get('permalink', ''),
        'created_utc': d.get('created_utc', 0),
    }))
" 2>/dev/null || true)

    while IFS= read -r POST_LINE; do
      [ -z "$POST_LINE" ] && continue
      POST_ID=$(echo "$POST_LINE" | python3 -c "import sys,json; print(json.load(sys.stdin)['id'])")

      # Skip already-processed posts
      if node lib/cli/is-reddit-processed.js "$POST_ID" 2>/dev/null; then
        continue
      fi

      # Check if we already have this post
      if echo "$SEEN_IDS" | grep -qw "$POST_ID" 2>/dev/null; then
        continue
      fi

      SEEN_IDS="${SEEN_IDS:+$SEEN_IDS }$POST_ID"
      ALL_POSTS="${ALL_POSTS}${POST_LINE}
"
      POST_COUNT=$((POST_COUNT + 1))
    done <<< "$POSTS"

    # Rate limit: 3s between requests
    sleep 3
  done
done

if [ "$POST_COUNT" -eq 0 ]; then
  log "No new Reddit posts found matching criteria."
  exit 0
fi

log "Found $POST_COUNT new Reddit posts. Fetching top comments..."

# ============================================================
# Fetch top comments for each post (via PullPush comment API)
# ============================================================
ENRICHED_TEXT=""

while IFS= read -r POST_LINE; do
  [ -z "$POST_LINE" ] && continue
  POST_ID=$(echo "$POST_LINE" | python3 -c "import sys,json; print(json.load(sys.stdin)['id'])")
  POST_SUB=$(echo "$POST_LINE" | python3 -c "import sys,json; print(json.load(sys.stdin)['subreddit'])")
  POST_TITLE=$(echo "$POST_LINE" | python3 -c "import sys,json; print(json.load(sys.stdin)['title'])")
  POST_TEXT=$(echo "$POST_LINE" | python3 -c "import sys,json; print(json.load(sys.stdin)['selftext'][:1000])")
  POST_URL=$(echo "$POST_LINE" | python3 -c "import sys,json; print(json.load(sys.stdin)['url'])")
  POST_SCORE=$(echo "$POST_LINE" | python3 -c "import sys,json; print(json.load(sys.stdin)['score'])")

  # Fetch top comments via PullPush
  COMMENTS=""
  COMMENTS_JSON=$(curl -sf \
    -H "User-Agent: $UA" \
    "https://api.pullpush.io/reddit/search/comment/?link_id=t3_${POST_ID}&size=5&sort=desc&sort_type=score" \
    2>/dev/null) || true

  if [ -n "$COMMENTS_JSON" ]; then
    COMMENTS=$(echo "$COMMENTS_JSON" | python3 -c "
import sys, json
data = json.load(sys.stdin)
for c in data.get('data', [])[:5]:
    body = c.get('body', '')
    if body and len(body) > 20:
        print('  > ' + body[:500])
" 2>/dev/null || true)
  fi

  ENRICHED_TEXT="${ENRICHED_TEXT}

--- POST (r/${POST_SUB}, score: ${POST_SCORE}, id: ${POST_ID}) ---
Title: ${POST_TITLE}
URL: ${POST_URL}
${POST_TEXT}
${COMMENTS:+
Top comments:
$COMMENTS}
"

  sleep 3
done <<< "$ALL_POSTS"

# ============================================================
# Deduplicate against recent tweets
# ============================================================
RECENT_IDS=$(node lib/cli/recent-source-ids.js 7 | jq -r '.[]' | sort -u)

# ============================================================
# Score via Claude
# ============================================================
log "Scoring $POST_COUNT posts via Claude..."

TMPTEXT=$(mktemp)
echo "$ENRICHED_TEXT" > "$TMPTEXT"

SCORING_PROMPT=$(cat "$PROMPTS_DIR/scan-competitors.md")

SCORE_OUTPUT=$(claude -p "${SCORING_PROMPT}

---

## Reddit Posts

$(cat "$TMPTEXT")" \
  --dangerously-skip-permissions \
  --max-turns 3 \
  2>&1) || {
  log "ERROR: Claude scoring failed"
  rm -f "$TMPTEXT"
  report_failure "Claude scoring"
  exit 1
}

rm -f "$TMPTEXT"

echo "$SCORE_OUTPUT" | tee -a "$LOG_FILE"

# Extract JSON from Claude output
SCORE_JSON=$(echo "$SCORE_OUTPUT" | python3 -c "
import sys, json, re
text = sys.stdin.read()
for m in re.finditer(r'\{', text):
    try:
        obj = json.loads(text[m.start():])
        if 'score' in obj:
            print(json.dumps(obj))
            break
    except json.JSONDecodeError:
        for end in range(m.start()+2, len(text)+1):
            try:
                obj = json.loads(text[m.start():end])
                if 'score' in obj:
                    print(json.dumps(obj))
                    sys.exit(0)
            except json.JSONDecodeError:
                continue
" 2>/dev/null || true)

if [ -z "$SCORE_JSON" ]; then
  log "WARNING: Could not extract JSON from Claude output — no qualifying post"
  # Record all posts as processed
  node lib/cli/mark-reddit-processed.js $SEEN_IDS
  exit 0
fi

SCORE=$(echo "$SCORE_JSON" | jq -r '(.score // 0) | floor')
TITLE=$(echo "$SCORE_JSON" | jq -r '.title // empty')

log "Best opportunity: \"$TITLE\" (score: $SCORE)"

# Check dedup against recent tweet source IDs
if [ -n "$TITLE" ] && echo "$RECENT_IDS" | grep -qF "competitor: $TITLE"; then
  log "Opportunity already tweeted recently — skipping"
  SCORE=0
fi

if [ "$SCORE" -lt 60 ]; then
  log "No post scored >= 60. Nothing to stage."
else
  # Build competitor source JSON
  TMPFILE=$(mktemp)
  echo "$SCORE_JSON" | jq \
    --arg created_at "$(date -Iseconds)" \
    '. + {type: "competitor", created_at: $created_at}' \
    > "$TMPFILE"

  cat "$TMPFILE" | node lib/cli/save-competitor-source.js
  rm -f "$TMPFILE"
  log "Staging competitor opportunity for slot 3 tweet (score: $SCORE)"
fi

# ============================================================
# Record all processed posts
# ============================================================
log "Recording processed posts..."
# Get post_ids from Claude output (includes all input posts)
CLAUDE_POST_IDS=$(echo "$SCORE_JSON" | jq -r '.post_ids[]? // empty' 2>/dev/null || true)

# Merge Claude's list with our seen list (Claude may not return all)
ALL_POST_IDS="$SEEN_IDS"
for CID in $CLAUDE_POST_IDS; do
  if ! echo "$ALL_POST_IDS" | grep -qw "$CID" 2>/dev/null; then
    ALL_POST_IDS="$ALL_POST_IDS $CID"
  fi
done

node lib/cli/mark-reddit-processed.js $ALL_POST_IDS

log "Done."

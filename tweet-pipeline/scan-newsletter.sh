#!/usr/bin/env bash
# Newsletter scanner — reads crypto newsletters from AgentMail, scores stories via Claude
# Runs daily at 11:00 UTC via systemd timer, before slot 3 draft at 15:00 UTC
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
ENV_FILE="/opt/blog-pipeline.env"
PROMPTS_DIR="$SCRIPT_DIR/prompts"
LOG_DIR="/var/log/tweet-pipeline"
QUEUE_DIR="${TWEET_QUEUE_DIR:-/home/blog/tweet-queue}"
INBOX="ethernal@agentmail.to"
NEWSLETTER_FILE="$SCRIPT_DIR/.newsletter-source.json"
BLOG_CANDIDATE_FILE="$SCRIPT_DIR/.blog-candidate.json"

mkdir -p "$LOG_DIR"
LOG_FILE="$LOG_DIR/scan-$(date +%Y%m%d-%H%M%S).log"

log() { echo "[$(date -Iseconds)] $*" | tee -a "$LOG_FILE"; }

# Report failure to GitHub Issues
FAILURE_REPORTED=false
report_failure() {
  [ "$FAILURE_REPORTED" = true ] && return
  FAILURE_REPORTED=true
  local phase="$1"
  local log_tail
  log_tail=$(tail -50 "$LOG_FILE" 2>/dev/null || echo "No log available")
  local title="Newsletter scanner failed: $phase"

  gh issue create \
    --repo tryethernal/ethernal \
    --title "$title" \
    --label "tweet-pipeline" \
    --body "$(cat <<EOF
## Newsletter Scanner Failure

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
  QUEUE_DIR="${TWEET_QUEUE_DIR:-/home/blog/tweet-queue}"
else
  log "ERROR: $ENV_FILE not found"
  report_failure "Environment"
  exit 1
fi

# Verify required env vars
if [ -z "${AGENTMAIL_API_KEY:-}" ]; then
  log "ERROR: AGENTMAIL_API_KEY not set"
  report_failure "Environment (missing AGENTMAIL_API_KEY)"
  exit 1
fi

# Clean up stale newsletter source (older than 24h)
if [ -f "$NEWSLETTER_FILE" ]; then
  CREATED=$(jq -r '.created_at // empty' "$NEWSLETTER_FILE" 2>/dev/null)
  if [ -n "$CREATED" ]; then
    CREATED_EPOCH=$(date -d "$CREATED" +%s 2>/dev/null || echo "0")
    NOW_EPOCH=$(date +%s)
    AGE=$(( NOW_EPOCH - CREATED_EPOCH ))
    if [ "$AGE" -gt 86400 ]; then
      log "Removing stale .newsletter-source.json (age: ${AGE}s)"
      rm -f "$NEWSLETTER_FILE"
    fi
  fi
fi

log "Starting newsletter scan..."

# ============================================================
# Fetch unread newsletters from AgentMail
# ============================================================
log "Fetching threads from AgentMail..."

THREADS_JSON=$(curl -sf \
  -H "Authorization: Bearer $AGENTMAIL_API_KEY" \
  "https://api.agentmail.to/v0/inboxes/$INBOX/threads" 2>&1) || {
  log "WARNING: AgentMail API unreachable — exiting cleanly"
  exit 0
}

# Filter for unread threads from AlphaPacked
MATCHING_THREADS=$(echo "$THREADS_JSON" | jq -r '
  [.threads[] |
   select(.labels | index("unread")) |
   select(.senders[]? | ascii_downcase | contains("alphapacked")) |
   .thread_id
  ] | .[]' 2>/dev/null || true)

if [ -z "$MATCHING_THREADS" ]; then
  log "No unread AlphaPacked newsletters found."
  exit 0
fi

THREAD_COUNT=$(echo "$MATCHING_THREADS" | wc -l | tr -d ' ')
log "Found $THREAD_COUNT unread newsletter(s)."

# ============================================================
# Fetch and concatenate ALL unread newsletters
# ============================================================
ALL_NEWSLETTER_TEXT=""
LATEST_DATE=""

for THREAD_ID in $MATCHING_THREADS; do
  log "Fetching thread $THREAD_ID..."

  THREAD_JSON=$(curl -sf \
    -H "Authorization: Bearer $AGENTMAIL_API_KEY" \
    "https://api.agentmail.to/v0/inboxes/$INBOX/threads/$THREAD_ID" 2>&1) || {
    log "WARNING: Failed to fetch thread $THREAD_ID — skipping"
    continue
  }

  TEXT=$(echo "$THREAD_JSON" | jq -r '.messages[0].text // empty')
  if [ -z "$TEXT" ]; then
    log "WARNING: Thread $THREAD_ID has no text — skipping"
    continue
  fi

  TDATE=$(echo "$THREAD_JSON" | jq -r '.messages[0].date // .timestamp // empty' | cut -c1-10)
  log "Newsletter date: $TDATE (thread $THREAD_ID)"

  ALL_NEWSLETTER_TEXT="${ALL_NEWSLETTER_TEXT}

--- NEWSLETTER (${TDATE}) ---

${TEXT}"
  LATEST_DATE="$TDATE"
done

if [ -z "$ALL_NEWSLETTER_TEXT" ]; then
  log "WARNING: No newsletter text extracted from any thread — exiting"
  exit 0
fi

NEWSLETTER_DATE="${LATEST_DATE}"
log "Concatenated $THREAD_COUNT newsletter(s) for scoring."

# ============================================================
# Deduplicate against recent tweets
# ============================================================
RECENT_IDS=$(find "$QUEUE_DIR" -name 'tweet-*.json' -mtime -7 -exec cat {} + 2>/dev/null \
  | jq -r '.sourceId // empty' 2>/dev/null \
  | sort -u || true)

# ============================================================
# Score ALL stories across all newsletters via Claude
# ============================================================
log "Scoring stories via Claude..."

# Write all newsletter text to temp file (avoids shell escaping issues)
TMPTEXT=$(mktemp)
echo "$ALL_NEWSLETTER_TEXT" > "$TMPTEXT"

SCORING_PROMPT=$(cat "$PROMPTS_DIR/scan-newsletter.md")

SCORE_OUTPUT=$(claude -p "${SCORING_PROMPT}

---

## Newsletter Content

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

# Extract JSON from Claude output (find the outermost JSON object with 'score' key)
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
  log "WARNING: Could not extract JSON from Claude output — no qualifying story"
  # Mark all threads as read anyway
  for TID in $MATCHING_THREADS; do
    curl -sf -X PATCH \
      -H "Authorization: Bearer $AGENTMAIL_API_KEY" \
      -H "Content-Type: application/json" \
      -d '{"remove_labels":["unread"]}' \
      "https://api.agentmail.to/v0/inboxes/$INBOX/threads/$TID" > /dev/null 2>&1 || true
  done
  exit 0
fi

SCORE=$(echo "$SCORE_JSON" | jq -r '.score // 0')
TITLE=$(echo "$SCORE_JSON" | jq -r '.title // empty')

log "Top story: \"$TITLE\" (score: $SCORE)"

# Check dedup
if echo "$RECENT_IDS" | grep -qF "newsletter: $TITLE"; then
  log "Story already tweeted recently — skipping"
  SCORE=0
fi

if [ "$SCORE" -lt 60 ]; then
  log "No story scored >= 60. Nothing to stage."
else
  log "Staging story for slot 3..."

  # Write .newsletter-source.json atomically
  TMPFILE=$(mktemp)
  echo "$SCORE_JSON" | jq \
    --arg newsletter "AlphaPacked" \
    --arg newsletter_date "$NEWSLETTER_DATE" \
    --arg created_at "$(date -Iseconds)" \
    '. + {type: "newsletter", newsletter: $newsletter, newsletter_date: $newsletter_date, created_at: $created_at}' \
    > "$TMPFILE"
  mv "$TMPFILE" "$NEWSLETTER_FILE"

  log "Wrote $NEWSLETTER_FILE"

  # Blog escalation
  BLOG_WORTHY=$(echo "$SCORE_JSON" | jq -r '.blog_worthy // false')
  if [ "$BLOG_WORTHY" = "true" ]; then
    cp "$NEWSLETTER_FILE" "$BLOG_CANDIDATE_FILE"
    log "Blog-worthy story — wrote $BLOG_CANDIDATE_FILE"
  fi
fi

# ============================================================
# Mark all processed newsletters as read
# ============================================================
log "Marking newsletters as read..."
for TID in $MATCHING_THREADS; do
  curl -sf -X PATCH \
    -H "Authorization: Bearer $AGENTMAIL_API_KEY" \
    -H "Content-Type: application/json" \
    -d '{"remove_labels":["unread"]}' \
    "https://api.agentmail.to/v0/inboxes/$INBOX/threads/$TID" > /dev/null 2>&1 || true
done

log "Done."

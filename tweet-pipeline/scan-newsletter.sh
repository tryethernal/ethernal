#!/usr/bin/env bash
# Newsletter scanner — reads crypto newsletters from AgentMail, scores stories via Claude
# Runs daily at 11:00 UTC via systemd timer, before slot 3 draft at 15:00 UTC
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ENV_FILE="/opt/blog-pipeline.env"
PROMPTS_DIR="$SCRIPT_DIR/prompts"
LOG_DIR="/var/log/tweet-pipeline"
INBOX="ethernal@agentmail.to"

mkdir -p "$LOG_DIR"
LOG_FILE="$LOG_DIR/scan-$(date +%Y%m%d-%H%M%S).log"

log() { echo "[$(date -Iseconds)] $*" | tee -a "$LOG_FILE"; }

# Failure reporting (deduplicates into existing open issues)
FAILURE_TITLE_PREFIX="Newsletter scanner failed"
source "$SCRIPT_DIR/lib/report-failure.sh"

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

# Verify required env vars
if [ -z "${AGENTMAIL_API_KEY:-}" ]; then
  log "ERROR: AGENTMAIL_API_KEY not set"
  report_failure "Environment (missing AGENTMAIL_API_KEY)"
  exit 1
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

# Filter for AlphaPacked threads (direct or forwarded)
MATCHING_THREADS=$(echo "$THREADS_JSON" | jq -r '
  [.threads[] |
   select(
     (.senders[]? | ascii_downcase | contains("alphapacked")) or
     (.subject | ascii_downcase | contains("alphapacked")) or
     (.preview | ascii_downcase | contains("alphapacked"))
   ) |
   .thread_id
  ] | .[]' 2>/dev/null || true)

# Remove already-processed threads
UNPROCESSED=""
for TID in $MATCHING_THREADS; do
  if ! node lib/cli/is-thread-processed.js "$TID" 2>/dev/null; then
    UNPROCESSED="${UNPROCESSED:+$UNPROCESSED
}$TID"
  fi
done
MATCHING_THREADS="$UNPROCESSED"

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

  # If plain text is missing or too short (just a footer/boilerplate), extract from HTML.
  # Newsletter emails often have minimal plain text (footer + "read online" link) with
  # all real content in HTML. Threshold of 2000 catches these reliably.
  TEXT_LEN=${#TEXT}
  if [ "$TEXT_LEN" -lt 2000 ]; then
    HTML=$(echo "$THREAD_JSON" | jq -r '.messages[0].html // empty')
    if [ -n "$HTML" ]; then
      HTML_TEXT=$(echo "$HTML" | python3 -c "
import sys
from html.parser import HTMLParser
class T(HTMLParser):
    def __init__(self):
        super().__init__()
        self.t=[]
        self.skip=False
    def handle_starttag(self,tag,a):
        if tag in('style','script'): self.skip=True
        if tag=='br': self.t.append('\n')
    def handle_startendtag(self,tag,a):
        if tag=='br': self.t.append('\n')
    def handle_endtag(self,tag):
        if tag in('style','script'): self.skip=False
        if tag in('p','div','h1','h2','h3','h4','li','tr'): self.t.append('\n')
    def handle_data(self,d):
        if not self.skip: self.t.append(d)
p=T()
p.feed(sys.stdin.read())
print(''.join(p.t))
" 2>/dev/null || true)
      if [ ${#HTML_TEXT} -gt ${#TEXT} ]; then
        log "Plain text too short (${TEXT_LEN} chars), using HTML extraction (${#HTML_TEXT} chars)"
        TEXT="$HTML_TEXT"
      fi
    fi
  fi

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
RECENT_IDS=$(node lib/cli/recent-source-ids.js 7 | jq -r '.[]' | sort -u)

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
  # Record as processed to avoid reprocessing
  node lib/cli/mark-thread-processed.js $MATCHING_THREADS
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
  BLOG_WORTHY=$(echo "$SCORE_JSON" | jq -r '.blog_worthy // false')

  # Build enriched JSON for either output file
  TMPFILE=$(mktemp)
  echo "$SCORE_JSON" | jq \
    --arg newsletter "AlphaPacked" \
    --arg newsletter_date "$NEWSLETTER_DATE" \
    --arg created_at "$(date -Iseconds)" \
    '. + {type: "newsletter", newsletter: $newsletter, newsletter_date: $newsletter_date, created_at: $created_at}' \
    > "$TMPFILE"

  if [ "$BLOG_WORTHY" = "true" ]; then
    # Blog-worthy: schedule blog only, promo tweet will follow on publish
    cat "$TMPFILE" | node lib/cli/save-blog-candidate.js && rm -f "$TMPFILE"
    log "Blog-worthy story (score: $SCORE) — scheduling blog only, promo tweet will follow on publish"
  else
    # Tweet-only: stage for slot 3 thread
    cat "$TMPFILE" | node lib/cli/save-newsletter-source.js && rm -f "$TMPFILE"
    log "Staging story for slot 3 tweet thread (score: $SCORE)"
  fi
fi

# ============================================================
# Record processed threads to avoid reprocessing
# ============================================================
log "Recording processed threads..."
node lib/cli/mark-thread-processed.js $MATCHING_THREADS

log "Done."

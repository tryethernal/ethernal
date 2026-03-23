#!/usr/bin/env bash
# Competitor monitor — uses Claude WebSearch to find block explorer mentions
# Runs every 3 days via systemd timer, before slot 3 draft
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ENV_FILE="/opt/blog-pipeline.env"
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

# Detect Claude auth/API errors
check_claude_output() {
  local output="$1"
  local phase="$2"
  if echo "$output" | grep -qiE "authentication_error|Invalid authentication|Invalid.*token|Invalid API key|401.*error|403.*error|Not logged in|Please run /login"; then
    log "ERROR: Claude returned an auth/API error in $phase: $(echo "$output" | head -5)"
    report_failure "Claude auth error in $phase"
    exit 1
  fi
}

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
# Deduplicate against recent tweets
# ============================================================
RECENT_IDS=$(node lib/cli/recent-source-ids.js 7 | jq -r '.[]' | sort -u)

# ============================================================
# Claude WebSearch: find and score competitor mentions
# ============================================================
log "Searching via Claude WebSearch..."

PROMPT="Do exactly ONE WebSearch for: blockscout OR \"block explorer\" alternative OR L2 site:reddit.com 2026

From results, find the single best tweet opportunity for Ethernal (open-source EVM block explorer with whitelabel, OP Stack/Orbit support, managed cloud).

Scoring: 80-100=someone evaluating explorers or complaining about Blockscout. 60-79=explorer infrastructure discussion. Below 60=skip.

Skip these already-covered topics:
${RECENT_IDS}

Return ONLY a raw JSON object (no markdown fences):
{\"score\": N, \"title\": \"short title\", \"content\": \"relevant quotes\", \"url\": \"https://...\", \"angle\": \"tweet angle suggestion\"}

If nothing scores >= 60: {\"score\": 0, \"title\": \"No qualifying opportunities\"}"

SCORE_OUTPUT=$(claude -p "$PROMPT" \
  --dangerously-skip-permissions \
  --max-turns 2 \
  2>&1) || true

echo "$SCORE_OUTPUT" | tee -a "$LOG_FILE"
check_claude_output "$SCORE_OUTPUT" "Search"

# Extract JSON from Claude output
SCORE_JSON=$(echo "$SCORE_OUTPUT" | python3 -c "
import sys, json, re
text = sys.stdin.read()
# Try to find JSON with score field
for m in re.finditer(r'\{', text):
    for end in range(m.start()+2, min(m.start()+2000, len(text)+1)):
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
  exit 0
fi

SCORE=$(echo "$SCORE_JSON" | jq -r '(.score // 0) | floor')
TITLE=$(echo "$SCORE_JSON" | jq -r '.title // empty')

log "Best opportunity: \"$TITLE\" (score: $SCORE)"

# Check dedup
if [ -n "$TITLE" ] && echo "$RECENT_IDS" | grep -qF "competitor: $TITLE"; then
  log "Opportunity already tweeted recently — skipping"
  SCORE=0
fi

if [ "$SCORE" -lt 60 ]; then
  log "No opportunity scored >= 60. Nothing to stage."
else
  TMPFILE=$(mktemp)
  echo "$SCORE_JSON" | jq \
    --arg created_at "$(date -Iseconds)" \
    '. + {type: "competitor", created_at: $created_at}' \
    > "$TMPFILE"

  cat "$TMPFILE" | node lib/cli/save-competitor-source.js
  rm -f "$TMPFILE"
  log "Staging competitor opportunity for slot 3 tweet (score: $SCORE)"
fi

log "Done."

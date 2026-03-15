#!/usr/bin/env bash
# Tweet draft automation — runs on Hetzner via systemd timer
# Three-phase pipeline: research → draft → humanize
# Each phase is a separate Claude call with focused instructions
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
ENV_FILE="/opt/blog-pipeline.env"
MCP_CONFIG="$SCRIPT_DIR/mcp.json"
PROMPTS_DIR="$SCRIPT_DIR/prompts"
LOG_DIR="/var/log/tweet-pipeline"
QUEUE_DIR="${TWEET_QUEUE_DIR:-/home/blog/tweet-queue}"

mkdir -p "$LOG_DIR" "$QUEUE_DIR"
LOG_FILE="$LOG_DIR/draft-$(date +%Y%m%d-%H%M%S).log"

log() { echo "[$(date -Iseconds)] $*" | tee -a "$LOG_FILE"; }

# Load environment
if [ -f "$ENV_FILE" ]; then
  set -a
  source "$ENV_FILE"
  set +a
  # Re-apply QUEUE_DIR after sourcing env (env may override default)
  QUEUE_DIR="${TWEET_QUEUE_DIR:-/home/blog/tweet-queue}"
else
  log "ERROR: $ENV_FILE not found"
  exit 1
fi

# Determine slot (1-5) from arg or auto-detect from UTC hour
if [ -n "${1:-}" ]; then
  SLOT="$1"
else
  HOUR=$(date -u +%-H)
  if   [ "$HOUR" -lt 9  ]; then SLOT=1
  elif [ "$HOUR" -lt 12 ]; then SLOT=2
  elif [ "$HOUR" -lt 15 ]; then SLOT=3
  elif [ "$HOUR" -lt 18 ]; then SLOT=4
  else                          SLOT=5
  fi
fi

log "Starting tweet draft pipeline — slot $SLOT"

cd "$REPO_DIR"

# Pull latest
log "Pulling latest changes..."
git checkout develop 2>&1 | tee -a "$LOG_FILE"
git pull --ff-only origin develop 2>&1 | tee -a "$LOG_FILE"

# Install pipeline deps
cd tweet-pipeline
npm ci --silent 2>&1 | tee -a "$LOG_FILE"

# Prevent overlapping runs via lockfile
LOCKFILE="/tmp/tweet-draft.lock"
exec 200>"$LOCKFILE"
if ! flock -n 200; then
  log "Another draft run is in progress — exiting"
  exit 0
fi

# ============================================================
# Source selection
# ============================================================
log "Selecting source for slot $SLOT..."

# Collect recent sourceIds from queue dir (last 7 days)
RECENT_IDS=$(find "$QUEUE_DIR" -name 'tweet-*.json' -mtime -7 -exec cat {} + 2>/dev/null \
  | jq -r '.sourceId // empty' 2>/dev/null \
  | jq -R -s 'split("\n") | map(select(. != ""))' 2>/dev/null \
  || echo '[]')

SLOT="$SLOT" RECENT_IDS="$RECENT_IDS" node --input-type=module -e "
  import { BUCKETS, getScheduledTime } from './config.js';
  import { selectSource } from './lib/source-selector.js';
  import { writeFileSync } from 'node:fs';

  const slot = parseInt(process.env.SLOT, 10);
  const bucket = BUCKETS.find(b => b.slot === slot);
  if (!bucket) { console.error('Invalid slot: ' + slot); process.exit(1); }

  const recentIds = JSON.parse(process.env.RECENT_IDS);
  const selected = selectSource(bucket.source, recentIds);
  const scheduledAt = getScheduledTime(new Date(), bucket.baseHourUTC);

  const result = {
    sourceId: selected.title,
    source: selected,
    bucket: bucket.label,
    slot: bucket.slot,
    scheduledAt: scheduledAt.toISOString(),
  };

  writeFileSync('.source.json', JSON.stringify(result, null, 2));
  console.log('Selected: ' + selected.title + ' (bucket: ' + bucket.label + ')');
" 2>&1 | tee -a "$LOG_FILE"

if [ ! -f .source.json ]; then
  log "ERROR: Source selection failed — no .source.json produced"
  exit 1
fi

log "Source selected. Starting Claude phases..."

# ============================================================
# PHASE 1: Research
# ============================================================
log "Phase 1: Research..."

PHASE1_OUTPUT=$(claude -p "$(cat "$PROMPTS_DIR/tweet-1-research.md")" \
  --dangerously-skip-permissions \
  --mcp-config "$MCP_CONFIG" \
  --max-turns 15 \
  2>&1)

echo "$PHASE1_OUTPUT" | tee -a "$LOG_FILE"

if [ ! -f .research.md ]; then
  log "ERROR: Phase 1 failed — no .research.md produced"
  rm -f .source.json
  exit 1
fi

log "Phase 1 complete. Research notes saved."

# ============================================================
# PHASE 2: Draft
# ============================================================
log "Phase 2: Draft..."

PHASE2_OUTPUT=$(claude -p "$(cat "$PROMPTS_DIR/tweet-2-draft.md")" \
  --dangerously-skip-permissions \
  --max-turns 10 \
  2>&1)

echo "$PHASE2_OUTPUT" | tee -a "$LOG_FILE"

if [ ! -f .draft.json ]; then
  log "ERROR: Phase 2 failed — no .draft.json produced"
  rm -f .source.json .research.md
  exit 1
fi

# Validate draft has a hook field
if ! jq -e '.hook' .draft.json > /dev/null 2>&1; then
  log "ERROR: Phase 2 failed — .draft.json missing .hook field"
  rm -f .source.json .research.md .draft.json
  exit 1
fi

log "Phase 2 complete. Draft saved."

# ============================================================
# PHASE 3: Humanize
# ============================================================
log "Phase 3: Humanize..."

PHASE3_OUTPUT=$(claude -p "$(cat "$PROMPTS_DIR/tweet-3-humanize.md")" \
  --dangerously-skip-permissions \
  --max-turns 5 \
  2>&1)

echo "$PHASE3_OUTPUT" | tee -a "$LOG_FILE"

log "Phase 3 complete."

# ============================================================
# Image generation
# ============================================================
log "Generating image..."

IMAGE_SPEC=$(jq -r '.imageSpec // empty' .draft.json)
IMAGE_PATH=""

if [ -n "$IMAGE_SPEC" ]; then
  IMAGE_TYPE=$(echo "$IMAGE_SPEC" | jq -r '.type // empty')

  if [ "$IMAGE_TYPE" = "blog_cover" ]; then
    # Use existing blog cover image
    SLUG=$(echo "$IMAGE_SPEC" | jq -r '.slug // empty')
    COVER_PATH="$REPO_DIR/blog/public/images/${SLUG}.png"
    if [ -f "$COVER_PATH" ]; then
      IMAGE_PATH="$COVER_PATH"
      log "Using blog cover image: $IMAGE_PATH"
    else
      log "WARNING: Blog cover not found at $COVER_PATH — continuing without image"
    fi
  else
    # Render via image-generator.js
    IMAGE_FILENAME="tweet-$(date +%Y%m%d-%H%M%S).png"
    IMAGE_OUTPUT="$QUEUE_DIR/$IMAGE_FILENAME"

    if IMAGE_SPEC="$IMAGE_SPEC" IMAGE_OUTPUT="$IMAGE_OUTPUT" node --input-type=module -e "
      import { generateImage } from './lib/image-generator.js';
      const spec = JSON.parse(process.env.IMAGE_SPEC);
      await generateImage(spec, process.env.IMAGE_OUTPUT);
    " 2>&1 | tee -a "$LOG_FILE"; then
      IMAGE_PATH="$IMAGE_OUTPUT"
      log "Image generated: $IMAGE_PATH"
    else
      log "WARNING: Image generation failed — continuing without image"
    fi
  fi
else
  log "No image spec in draft — skipping image generation"
fi

# ============================================================
# Queue the tweet
# ============================================================
log "Queuing tweet..."

SOURCE_JSON=$(cat .source.json)
DRAFT_JSON=$(cat .draft.json)
HOOK=$(echo "$DRAFT_JSON" | jq -r '.hook')
THREAD=$(echo "$DRAFT_JSON" | jq '.thread // []')
IMAGE_SPEC_FIELD=$(echo "$DRAFT_JSON" | jq '.imageSpec // null')
BUCKET=$(echo "$SOURCE_JSON" | jq -r '.bucket')
SOURCE_ID=$(echo "$SOURCE_JSON" | jq -r '.sourceId')
SCHEDULED_AT=$(echo "$SOURCE_JSON" | jq -r '.scheduledAt')

QUEUE_FILE="$QUEUE_DIR/tweet-$(date +%Y%m%d-%H%M%S)-slot${SLOT}.json"

jq -n \
  --arg hook "$HOOK" \
  --argjson thread "$THREAD" \
  --argjson imageSpec "$IMAGE_SPEC_FIELD" \
  --arg imagePath "$IMAGE_PATH" \
  --arg bucket "$BUCKET" \
  --arg sourceId "$SOURCE_ID" \
  --arg scheduledAt "$SCHEDULED_AT" \
  --arg createdAt "$(date -Iseconds)" \
  '{
    hook: $hook,
    thread: $thread,
    imageSpec: $imageSpec,
    imagePath: $imagePath,
    bucket: $bucket,
    sourceId: $sourceId,
    scheduledAt: $scheduledAt,
    createdAt: $createdAt,
    posted: false,
    tweetIds: []
  }' > "$QUEUE_FILE"

log "Tweet queued: $QUEUE_FILE"

# ============================================================
# Clean up temp files
# ============================================================
rm -f .source.json .research.md .draft.json

log "Done. Tweet scheduled for $SCHEDULED_AT (slot $SLOT, bucket: $BUCKET)"

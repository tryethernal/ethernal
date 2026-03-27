#!/usr/bin/env bash
# Tweet draft automation — runs on Hetzner via systemd timer
# Three-phase pipeline: research → draft → humanize
# Each phase is a separate Claude call with focused instructions
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ENV_FILE="/opt/blog-pipeline.env"
MCP_CONFIG="$SCRIPT_DIR/mcp.json"
PROMPTS_DIR="$SCRIPT_DIR/prompts"
LOG_DIR="/var/log/tweet-pipeline"
QUEUE_DIR="${TWEET_QUEUE_DIR:-/home/blog/tweet-queue}"

mkdir -p "$LOG_DIR" "$QUEUE_DIR"
LOG_FILE="$LOG_DIR/draft-$(date +%Y%m%d-%H%M%S).log"

log() { echo "[$(date -Iseconds)] $*" | tee -a "$LOG_FILE"; }

# Failure reporting (deduplicates into existing open issues)
FAILURE_TITLE_PREFIX="Tweet pipeline failed"
source "$SCRIPT_DIR/lib/report-failure.sh"

trap 'report_failure "Unexpected error (line $LINENO)"' ERR

# Detect Claude auth/API errors in output — abort early instead of posting error text
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
  # Re-apply QUEUE_DIR after sourcing env (env may override default)
  QUEUE_DIR="${TWEET_QUEUE_DIR:-/home/blog/tweet-queue}"
else
  log "ERROR: $ENV_FILE not found"
  report_failure "Environment"
  exit 1
fi

# Determine slot (1-5) from arg or auto-detect from UTC hour
if [ -n "${1:-}" ]; then
  SLOT="$1"
else
  # Ranges match timer schedule: 06:30, 12:30 UTC
  HOUR=$(date -u +%-H)
  if [ "$HOUR" -lt 10 ]; then SLOT=1
  else                        SLOT=2
  fi
fi

log "Starting tweet draft pipeline — slot $SLOT"

cd "$SCRIPT_DIR"

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

# Check for override sources (slot 2): competitor > newsletter > normal
SKIP_NORMAL_SOURCE=false
if [ "$SLOT" = "2" ]; then
  # 1. Check competitor source first (highest priority)
  COMP_JSON=$(node lib/cli/get-competitor-source.js 2>/dev/null) && SKIP_NORMAL_SOURCE=true || true
  if [ "$SKIP_NORMAL_SOURCE" = "true" ]; then
    log "Using competitor source for slot 2"
    COMP_JSON="$COMP_JSON" node --input-type=module -e "
      import { getScheduledTime } from './config.js';
      import { writeFileSync } from 'node:fs';
      const comp = JSON.parse(process.env.COMP_JSON);
      const scheduledAt = getScheduledTime(new Date(), 15);
      const result = {
        sourceId: 'competitor: ' + comp.title,
        source: { type: 'competitor', title: comp.title, content: comp.content, url: comp.url || '', angle: comp.angle || '' },
        bucket: 'Competitor response',
        slot: 2,
        scheduledAt: scheduledAt.toISOString(),
      };
      writeFileSync('.source.json', JSON.stringify(result, null, 2));
      console.log('Selected: ' + result.source.title + ' (bucket: Competitor response)');
    " 2>&1 | tee -a "$LOG_FILE"
    if [ -f .source.json ]; then
      # Defer consume until after semantic dedup check passes
      PENDING_CONSUME="competitor"
      log "Competitor source staged (consume deferred until after dedup)."
    else
      SKIP_NORMAL_SOURCE=false
      log "WARNING: .source.json not created — retaining competitor source for next run"
    fi
  fi

  # 2. Fall back to newsletter source
  if [ "$SKIP_NORMAL_SOURCE" != "true" ]; then
    NL_JSON=$(node lib/cli/get-newsletter-source.js 2>/dev/null) && SKIP_NORMAL_SOURCE=true || true
    if [ "$SKIP_NORMAL_SOURCE" = "true" ]; then
      log "Using newsletter source for slot 3"
      NL_JSON="$NL_JSON" node --input-type=module -e "
        import { getScheduledTime } from './config.js';
        import { writeFileSync } from 'node:fs';
        const nl = JSON.parse(process.env.NL_JSON);
        const scheduledAt = getScheduledTime(new Date(), 15);
        const result = {
          sourceId: 'newsletter: ' + nl.title,
          source: { type: 'newsletter', title: nl.title, content: nl.content, url: nl.source_url || '' },
          bucket: 'Newsletter story',
          slot: 2,
          scheduledAt: scheduledAt.toISOString(),
        };
        writeFileSync('.source.json', JSON.stringify(result, null, 2));
        console.log('Selected: ' + result.source.title + ' (bucket: Newsletter story)');
      " 2>&1 | tee -a "$LOG_FILE"
      if [ -f .source.json ]; then
        # Defer consume until after semantic dedup check passes
        PENDING_CONSUME="newsletter"
        log "Newsletter source staged (consume deferred until after dedup)."
      else
        SKIP_NORMAL_SOURCE=false
        log "WARNING: .source.json not created — retaining newsletter source for next run"
      fi
    fi
  fi
fi

if [ "$SKIP_NORMAL_SOURCE" != "true" ]; then
# Collect recent sourceIds from queue dir (last 30 days)
RECENT_IDS=$(node lib/cli/recent-source-ids.js 30)

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
fi

# ============================================================
# Semantic dedup — skip topics already covered by recent tweets or blog posts
# ============================================================
if [ -f .source.json ]; then
  PROMOTED_SLUGS=$(node lib/cli/promoted-slugs.js)

  RECENT_HOOKS=$(node lib/cli/recent-hooks.js 30)

  SOURCE_TITLE=$(jq -r '.source.title // .sourceId' .source.json)

  IS_DUP=$(SOURCE_TITLE="$SOURCE_TITLE" RECENT_HOOKS="$RECENT_HOOKS" PROMOTED_SLUGS="$PROMOTED_SLUGS" node --input-type=module -e "
    import { isSemanticallyDuplicate, fetchPublishedBlogTitles } from './lib/source-selector.js';

    const candidate = process.env.SOURCE_TITLE;
    const recentHooks = JSON.parse(process.env.RECENT_HOOKS);
    const promotedSlugs = JSON.parse(process.env.PROMOTED_SLUGS);
    const blogTitles = fetchPublishedBlogTitles(60);

    const isDup = isSemanticallyDuplicate(candidate, recentHooks, blogTitles, promotedSlugs);
    console.log(isDup ? 'true' : 'false');
  " 2>>"$LOG_FILE")

  if [ "$IS_DUP" = "true" ]; then
    log "WARNING: Source '$SOURCE_TITLE' is semantically similar to recent content — falling back to feature tip"
    # Clear pending consume — the override source was not used but stays in DB for next attempt
    if [ -n "${PENDING_CONSUME:-}" ]; then
      log "WARNING: Discarding ${PENDING_CONSUME} source due to dedup — retaining in DB for next run"
      PENDING_CONSUME=""
    fi
    rm -f .source.json

    # Fall back to a feature tip
    SLOT="$SLOT" RECENT_IDS="${RECENT_IDS:-[]}" node --input-type=module -e "
      import { getScheduledTime } from './config.js';
      import { selectSource } from './lib/source-selector.js';
      import { writeFileSync } from 'node:fs';

      const slot = parseInt(process.env.SLOT, 10);
      const baseHours = { 1: 7, 2: 10, 3: 15, 4: 16, 5: 19 };
      const recentIds = JSON.parse(process.env.RECENT_IDS || '[]');
      const selected = selectSource('features', recentIds);
      const scheduledAt = getScheduledTime(new Date(), baseHours[slot] || 15);

      writeFileSync('.source.json', JSON.stringify({
        sourceId: selected.title,
        source: selected,
        bucket: 'Product tip (dedup fallback)',
        slot,
        scheduledAt: scheduledAt.toISOString(),
      }, null, 2));
      console.log('Fallback: ' + selected.title);
    " 2>&1 | tee -a "$LOG_FILE"
  fi
fi

if [ ! -f .source.json ]; then
  log "ERROR: Source selection failed — no .source.json produced"
  report_failure "Source selection"
  exit 1
fi

# Consume deferred override source now that dedup has passed
if [ "${PENDING_CONSUME:-}" = "competitor" ]; then
  node --input-type=module -e "import { getDb } from './lib/db.js'; getDb().consumeCompetitorSource();"
  log "Competitor source consumed (post-dedup)."
elif [ "${PENDING_CONSUME:-}" = "newsletter" ]; then
  node --input-type=module -e "import { getDb } from './lib/db.js'; getDb().consumeNewsletterSource();"
  log "Newsletter source consumed (post-dedup)."
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
check_claude_output "$PHASE1_OUTPUT" "Research (Phase 1)"

if [ ! -f .research.md ]; then
  log "ERROR: Phase 1 failed — no .research.md produced"
  rm -f .source.json
  report_failure "Research (Phase 1)"
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
check_claude_output "$PHASE2_OUTPUT" "Draft (Phase 2)"

if [ ! -f .draft.json ]; then
  log "ERROR: Phase 2 failed — no .draft.json produced"
  rm -f .source.json .research.md
  report_failure "Draft (Phase 2)"
  exit 1
fi

# Validate draft has a hook field
if ! jq -e '.hook' .draft.json > /dev/null 2>&1; then
  log "ERROR: Phase 2 failed — .draft.json missing .hook field"
  rm -f .source.json .research.md .draft.json
  report_failure "Draft validation (Phase 2)"
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
check_claude_output "$PHASE3_OUTPUT" "Humanize (Phase 3)"

log "Phase 3 complete."

# ============================================================
# Post-draft semantic dedup — catch overlaps Claude introduced
# ============================================================
DRAFT_HOOK=$(jq -r '.hook // empty' .draft.json 2>/dev/null)
if [ -n "$DRAFT_HOOK" ]; then
  RECENT_HOOKS_POST=$(node lib/cli/recent-hooks.js 30)

  POST_DUP=$(DRAFT_HOOK="$DRAFT_HOOK" RECENT_HOOKS_POST="$RECENT_HOOKS_POST" node --input-type=module -e "
    import { isSemanticallyDuplicate, fetchPublishedBlogTitles } from './lib/source-selector.js';
    const isDup = isSemanticallyDuplicate(
      process.env.DRAFT_HOOK,
      JSON.parse(process.env.RECENT_HOOKS_POST),
      fetchPublishedBlogTitles(60),
      []
    );
    console.log(isDup ? 'true' : 'false');
  " 2>>"$LOG_FILE")

  if [ "$POST_DUP" = "true" ]; then
    log "WARNING: Drafted hook is semantically similar to recent content — aborting"
    log "Hook was: $DRAFT_HOOK"
    rm -f .source.json .research.md .draft.json
    exit 0
  fi
fi

# ============================================================
# Image generation
# ============================================================
log "Generating image..."

IMAGE_SPEC=$(jq -r '.imageSpec // empty' .draft.json)
IMAGE_PATH=""

if [ -n "$IMAGE_SPEC" ]; then
  IMAGE_TYPE=$(echo "$IMAGE_SPEC" | jq -r '.type // empty')

  if [ "$IMAGE_TYPE" = "blog_cover" ]; then
    # Download blog cover image from live site
    SLUG=$(echo "$IMAGE_SPEC" | jq -r '.slug // empty')
    TMPIMG="$QUEUE_DIR/${SLUG}-cover"
    FOUND_COVER=false
    for EXT in webp png jpg; do
      if curl -sf "https://tryethernal.com/blog/images/${SLUG}.${EXT}" -o "$TMPIMG"; then
        IMAGE_PATH="$TMPIMG"
        FOUND_COVER=true
        log "Downloaded blog cover image: ${SLUG}.${EXT}"
        break
      fi
    done
    if [ "$FOUND_COVER" = "false" ]; then
      rm -f "$TMPIMG"
      log "WARNING: Blog cover not found on live site for $SLUG — continuing without image"
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

TWEET_ID=$(jq -n \
  --arg hook "$HOOK" \
  --argjson thread "$THREAD" \
  --argjson imageSpec "$IMAGE_SPEC_FIELD" \
  --arg imagePath "$IMAGE_PATH" \
  --arg bucket "$BUCKET" \
  --arg sourceId "$SOURCE_ID" \
  --arg scheduledAt "$SCHEDULED_AT" \
  --argjson slot "$SLOT" \
  '{
    hook: $hook, thread: $thread, imageSpec: $imageSpec, imagePath: $imagePath,
    bucket: $bucket, sourceId: $sourceId, scheduledAt: $scheduledAt, slot: $slot
  }' | node lib/cli/queue-tweet.js)

log "Tweet queued: id=$(echo "$TWEET_ID" | jq -r '.id')"

# ============================================================
# Clean up temp files
# ============================================================
rm -f .source.json .research.md .draft.json

log "Done. Tweet scheduled for $SCHEDULED_AT (slot $SLOT, bucket: $BUCKET)"

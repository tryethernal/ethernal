#!/usr/bin/env bash
# Blog draft automation — runs on Hetzner via systemd timer
# Three-phase pipeline: research → draft → humanize
# Each phase is a separate Claude call with focused instructions
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
ENV_FILE="/opt/blog-pipeline.env"
MCP_CONFIG="$SCRIPT_DIR/mcp.json"
PROMPTS_DIR="$SCRIPT_DIR/prompts"
LOG_DIR="/var/log/blog-pipeline"

mkdir -p "$LOG_DIR"
LOG_FILE="$LOG_DIR/draft-$(date +%Y%m%d-%H%M%S).log"

log() { echo "[$(date -Iseconds)] $*" | tee -a "$LOG_FILE"; }

# Report failure to GitHub Issues with last 50 lines of log
FAILURE_REPORTED=false
report_failure() {
  [ "$FAILURE_REPORTED" = true ] && return
  FAILURE_REPORTED=true
  local phase="$1"
  local log_tail
  log_tail=$(tail -50 "$LOG_FILE" 2>/dev/null || echo "No log available")
  local title="Blog pipeline failed: $phase"
  [ -n "${TOPIC:-}" ] && title="Blog pipeline failed: $phase — $TOPIC"

  gh issue create \
    --repo tryethernal/ethernal \
    --title "$title" \
    --label "blog-pipeline" \
    --body "$(cat <<EOF
## Blog Pipeline Failure

**Phase:** $phase
**Topic:** ${TOPIC:-N/A}
**Card ID:** ${CARD_ID:-N/A}
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

cd "$REPO_DIR"

# Pull latest
log "Pulling latest changes..."
git checkout develop 2>&1 | tee -a "$LOG_FILE"
git pull --ff-only origin develop 2>&1 | tee -a "$LOG_FILE"

# Install pipeline deps if needed
cd blog/pipeline
npm ci --silent 2>&1 | tee -a "$LOG_FILE"

# Check for newsletter blog candidate (priority override)
BLOG_CANDIDATE="/opt/ethernal-blog-stack/tweet-pipeline/.blog-candidate.json"
SKIP_CARD_PICK=false
if [ -f "$BLOG_CANDIDATE" ]; then
  log "Found blog candidate from newsletter scanner"
  TOPIC=$(jq -r '.title' "$BLOG_CANDIDATE")
  CONTENT_TYPE="Research Deep Dive"
  CARD_ID=""
  CARD_BODY=$(jq -r '.content' "$BLOG_CANDIDATE")
  NL_ANGLE=$(jq -r '.angle // ""' "$BLOG_CANDIDATE")
  NL_FACTS=$(jq -r '.key_facts | join("; ")' "$BLOG_CANDIDATE")
  CARD_BODY="$CARD_BODY

Suggested angle: $NL_ANGLE
Key facts: $NL_FACTS"

  rm -f "$BLOG_CANDIDATE"
  log "Topic from newsletter: $TOPIC (type: $CONTENT_TYPE)"

  cd "$REPO_DIR"
  printf '**Topic:** %s\n**Content Type:** %s\n\n%s' "$TOPIC" "$CONTENT_TYPE" "$CARD_BODY" > blog/pipeline/.card-body.md
  rm -f blog/pipeline/.research-notes.md
  SKIP_CARD_PICK=true
fi

if [ "$SKIP_CARD_PICK" != "true" ]; then
# Pick the next topic
log "Picking next topic..."
PICK_OUTPUT=$(node index.js --pick 2>&1)
echo "$PICK_OUTPUT" | tee -a "$LOG_FILE"

PICKED=$(echo "$PICK_OUTPUT" | grep '::picked::' | sed 's/::picked:://')
if [ -z "$PICKED" ]; then
  log "No topic to pick. Exiting."
  exit 0
fi

# Extract fields from picked JSON
TOPIC=$(echo "$PICKED" | jq -r '.cluster')
CARD_ID=$(echo "$PICKED" | jq -r '.id')
CONTENT_TYPE=$(echo "$PICKED" | jq -r '.contentType')
CARD_BODY=$(echo "$PICKED" | jq -r '.body // ""')

log "Topic: $TOPIC (card: $CARD_ID, type: $CONTENT_TYPE)"

# Move card to Researched before Claude run to block duplicate picks
if [ -n "${CARD_ID:-}" ]; then
CARD_ID="$CARD_ID" node --input-type=module -e "
  import { updateCardStatus } from './project.js';
  updateCardStatus(process.env.CARD_ID, 'researched');
  console.log('Card moved to Researched');
" 2>&1 | tee -a "$LOG_FILE"
fi

cd "$REPO_DIR"
fi

# Write card body to file for Claude to read (newsletter path already wrote it)
if [ "$SKIP_CARD_PICK" != "true" ]; then
  printf '**Topic:** %s\n**Content Type:** %s\n\n%s' "$TOPIC" "$CONTENT_TYPE" "$CARD_BODY" > blog/pipeline/.card-body.md
  rm -f blog/pipeline/.research-notes.md
fi

# ============================================================
# PHASE 1: Research
# ============================================================
log "Phase 1: Research..."

PHASE1_OUTPUT=$(claude -p "$(cat "$PROMPTS_DIR/1-research.md")" \
  --dangerously-skip-permissions \
  --mcp-config "$MCP_CONFIG" \
  --max-turns 30 \
  2>&1)

echo "$PHASE1_OUTPUT" | tee -a "$LOG_FILE"

if [ ! -f blog/pipeline/.research-notes.md ]; then
  log "ERROR: Phase 1 failed — no research notes produced"
  if [ -n "${CARD_ID:-}" ]; then
    cd blog/pipeline
    CARD_ID="$CARD_ID" node --input-type=module -e "
      import { updateCardStatus } from './project.js';
      updateCardStatus(process.env.CARD_ID, 'detected');
      console.log('Card reset to Detected');
    " 2>&1 | tee -a "$LOG_FILE"
  fi
  report_failure "Research (Phase 1)"
  exit 1
fi

log "Phase 1 complete. Research notes saved."

# ============================================================
# PHASE 2: Draft
# ============================================================
log "Phase 2: Draft..."

PHASE2_OUTPUT=$(claude -p "$(cat "$PROMPTS_DIR/2-draft.md")" \
  --dangerously-skip-permissions \
  --max-turns 20 \
  2>&1)

echo "$PHASE2_OUTPUT" | tee -a "$LOG_FILE"

# Extract article path
ARTICLE_PATH=$(echo "$PHASE2_OUTPUT" | grep '::article-path::' | sed 's/::article-path:://' | tr -d ' ' | head -1)

if [ -z "$ARTICLE_PATH" ] || [ ! -f "$ARTICLE_PATH" ]; then
  log "ERROR: Phase 2 failed — no article produced"
  if [ -n "${CARD_ID:-}" ]; then
    cd blog/pipeline
    CARD_ID="$CARD_ID" node --input-type=module -e "
      import { updateCardStatus } from './project.js';
      updateCardStatus(process.env.CARD_ID, 'detected');
      console.log('Card reset to Detected');
    " 2>&1 | tee -a "$LOG_FILE"
  fi
  report_failure "Draft (Phase 2)"
  exit 1
fi

log "Phase 2 complete. Article: $ARTICLE_PATH"

# ============================================================
# PHASE 3: Humanize + Polish
# ============================================================
log "Phase 3: Humanize..."

PHASE3_OUTPUT=$(claude -p "Polish the article at $ARTICLE_PATH. $(cat "$PROMPTS_DIR/3-humanize.md")" \
  --dangerously-skip-permissions \
  --max-turns 10 \
  2>&1)

echo "$PHASE3_OUTPUT" | tee -a "$LOG_FILE"

# Hard safety net: sed out any remaining em dashes
if grep -q '—' "$ARTICLE_PATH"; then
  log "WARNING: Em dashes survived humanizer — stripping with sed"
  sed -i 's/—/,/g' "$ARTICLE_PATH"
fi

log "Phase 3 complete."

# ============================================================
# Validate: Astro build must pass before committing
# ============================================================
log "Validating blog build..."
cd "$REPO_DIR/blog"
if ! npx astro build 2>&1 | tee -a "$LOG_FILE"; then
  log "ERROR: Astro build failed — article has schema or syntax errors"
  if [ -n "${CARD_ID:-}" ]; then
    cd "$REPO_DIR/blog/pipeline"
    CARD_ID="$CARD_ID" node --input-type=module -e "
      import { updateCardStatus } from './project.js';
      updateCardStatus(process.env.CARD_ID, 'detected');
      console.log('Card reset to Detected');
    " 2>&1 | tee -a "$LOG_FILE"
  fi
  report_failure "Build Validation"
  exit 1
fi
cd "$REPO_DIR"
log "Build validation passed."

# ============================================================
# Commit, push, and update card
# ============================================================
SLUG=$(basename "$ARTICLE_PATH" .md)
SLUG=$(basename "$SLUG" .mdx)
ARTICLE_URL="https://tryethernal.com/blog/$SLUG"

# Generate cover image
log "Generating cover image..."
IMG_PROMPT="Flat vector flow diagram on dark navy background (#0f172a) with subtle dot grid pattern overlay. The diagram should visually represent the concept of: ${TOPIC}. Use rounded pill-shaped boxes in steel blue (#4a8ecb) with soft shadows, connected by thin arrows. 2-4 labeled elements showing a simple relationship or flow. Short generic labels only (2-3 words max per label, like 'Router', 'Pool', 'User'). Centered composition with lots of whitespace. Style: polished Figma mockup, NOT realistic 3D icons, NOT wireframes. CRITICAL: Do NOT render any numbers, dollar amounts, percentages, dates, or long text. Only short generic labels on diagram elements. No title text, no subtitle, no statistics, no dates."
"$SCRIPT_DIR/generate-cover.sh" "$SLUG" "$IMG_PROMPT" 2>&1 | tee -a "$LOG_FILE" || log "WARNING: Cover image generation failed"

# Commit everything
git add "$ARTICLE_PATH"
[ -f "blog/public/images/${SLUG}.png" ] && git add "blog/public/images/${SLUG}.png" "blog/public/images/${SLUG}-og.png"
TITLE=$(head -5 "$ARTICLE_PATH" | grep '^title:' | sed 's/^title: *"//;s/"$//')
git commit -m "blog: add draft - ${TITLE}" 2>&1 | tee -a "$LOG_FILE"
git push origin develop 2>&1 | tee -a "$LOG_FILE"

log "Pushed to develop."

# Update the project card (skip for newsletter-sourced articles)
if [ -n "${CARD_ID:-}" ]; then
log "Updating project card..."
cd blog/pipeline
CARD_ID="$CARD_ID" ARTICLE_PATH="$ARTICLE_PATH" node --input-type=module -e "
  import { updateCardStatus, setArticlePath } from './project.js';
  updateCardStatus(process.env.CARD_ID, 'drafting');
  setArticlePath(process.env.CARD_ID, process.env.ARTICLE_PATH);
  console.log('Card updated: Drafting + article path set');
" 2>&1 | tee -a "$LOG_FILE"
fi

# Clean up temp files
rm -f blog/pipeline/.research-notes.md blog/pipeline/.card-body.md

log "Done. Article deployed as draft: $ARTICLE_URL"

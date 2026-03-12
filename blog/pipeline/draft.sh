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

# Load environment
if [ -f "$ENV_FILE" ]; then
  set -a
  source "$ENV_FILE"
  set +a
else
  log "ERROR: $ENV_FILE not found"
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
CARD_ID="$CARD_ID" node --input-type=module -e "
  import { updateCardStatus } from './project.js';
  updateCardStatus(process.env.CARD_ID, 'researched');
  console.log('Card moved to Researched');
" 2>&1 | tee -a "$LOG_FILE"

cd "$REPO_DIR"

# Write card body to file for Claude to read (avoids shell interpolation)
printf '**Topic:** %s\n**Content Type:** %s\n\n%s' "$TOPIC" "$CONTENT_TYPE" "$CARD_BODY" > blog/pipeline/.card-body.md

# Clean up any previous research notes
rm -f blog/pipeline/.research-notes.md

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
  cd blog/pipeline
  CARD_ID="$CARD_ID" node --input-type=module -e "
    import { updateCardStatus } from './project.js';
    updateCardStatus(process.env.CARD_ID, 'detected');
    console.log('Card reset to Detected');
  " 2>&1 | tee -a "$LOG_FILE"
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
ARTICLE_PATH=$(echo "$PHASE2_OUTPUT" | grep '::article-path::' | sed 's/::article-path:://' | head -1)

if [ -z "$ARTICLE_PATH" ] || [ ! -f "$ARTICLE_PATH" ]; then
  log "ERROR: Phase 2 failed — no article produced"
  cd blog/pipeline
  CARD_ID="$CARD_ID" node --input-type=module -e "
    import { updateCardStatus } from './project.js';
    updateCardStatus(process.env.CARD_ID, 'detected');
    console.log('Card reset to Detected');
  " 2>&1 | tee -a "$LOG_FILE"
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
# Commit, push, and update card
# ============================================================
SLUG=$(basename "$ARTICLE_PATH" .md)
SLUG=$(basename "$SLUG" .mdx)
ARTICLE_URL="https://tryethernal.com/blog/$SLUG"

# Generate cover image
log "Generating cover image..."
IMG_PROMPT="Clean flat diagram on dark navy background (#0f172a). Topic: ${TOPIC}. Developer aesthetic, diagrammatic with text labels, 2-4 elements max, centered, lots of whitespace. NOT futuristic or glowy. Minimal, professional."
"$SCRIPT_DIR/generate-cover.sh" "$SLUG" "$IMG_PROMPT" 2>&1 | tee -a "$LOG_FILE" || log "WARNING: Cover image generation failed"

# Commit everything
git add "$ARTICLE_PATH"
[ -f "blog/public/images/${SLUG}.png" ] && git add "blog/public/images/${SLUG}.png" "blog/public/images/${SLUG}-og.png"
TITLE=$(head -5 "$ARTICLE_PATH" | grep '^title:' | sed 's/^title: *"//;s/"$//')
git commit -m "blog: add draft - ${TITLE}" 2>&1 | tee -a "$LOG_FILE"
git push origin develop 2>&1 | tee -a "$LOG_FILE"

log "Pushed to develop."

# Update the project card
log "Updating project card..."
cd blog/pipeline
CARD_ID="$CARD_ID" ARTICLE_PATH="$ARTICLE_PATH" node --input-type=module -e "
  import { updateCardStatus, setArticlePath } from './project.js';
  updateCardStatus(process.env.CARD_ID, 'drafting');
  setArticlePath(process.env.CARD_ID, process.env.ARTICLE_PATH);
  console.log('Card updated: Drafting + article path set');
" 2>&1 | tee -a "$LOG_FILE"

# Clean up temp files
rm -f blog/pipeline/.research-notes.md blog/pipeline/.card-body.md

log "Done. Article deployed as draft: $ARTICLE_URL"

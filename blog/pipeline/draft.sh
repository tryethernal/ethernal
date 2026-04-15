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

FAILURE_REPORTED=false

# Reset card to Detected so it can be retried
reset_card() {
  if [ -n "${CARD_ID:-}" ]; then
    log "Resetting card $CARD_ID to Detected..."
    cd "$REPO_DIR/blog/pipeline"
    CARD_ID="$CARD_ID" node --input-type=module -e "
      import { updateCardStatus } from './project.js';
      await updateCardStatus(process.env.CARD_ID, 'detected');
      console.log('Card reset to Detected');
    " 2>&1 | tee -a "$LOG_FILE" || log "WARNING: Failed to reset card status"
    cd "$REPO_DIR"
  fi
}

# Report failure to GitHub Issues with last 50 lines of log
report_failure() {
  [ "$FAILURE_REPORTED" = true ] && return
  FAILURE_REPORTED=true
  local phase="$1"

  # Reset card before reporting so it can be retried
  reset_card

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

# Catch unexpected failures (from set -e)
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

# Pull latest (fix ownership first — rsync deploys as root can leave root-owned files)
log "Pulling latest changes..."
if find "$REPO_DIR/.git" "$REPO_DIR/blog" -not -user "$(whoami)" -type f 2>/dev/null | head -1 | grep -q .; then
  log "WARNING: Found files not owned by $(whoami) — attempting ownership fix"
  sudo chown -R "$(whoami):$(id -gn)" "$REPO_DIR" || {
    log "ERROR: chown failed — git operations will likely fail. Add sudoers rule: blog ALL=(root) NOPASSWD: /usr/bin/chown -R blog\\:blog /opt/ethernal-blog-stack"
    exit 1
  }
fi
# Reset any local changes — server is a deployment target, never has intentional edits
git checkout develop 2>&1 | tee -a "$LOG_FILE"
git reset --hard origin/develop 2>&1 | tee -a "$LOG_FILE"
git pull --ff-only origin develop 2>&1 | tee -a "$LOG_FILE"

# Install pipeline deps if needed
cd blog/pipeline
npm ci --silent 2>&1 | tee -a "$LOG_FILE"

# Pick the next topic
log "Picking next topic..."
PICK_OUTPUT=$(node index.js --pick 2>&1)
echo "$PICK_OUTPUT" | tee -a "$LOG_FILE"

PICKED=$(echo "$PICK_OUTPUT" | grep '::picked::' | sed 's/::picked:://' || true)
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
  report_failure "Draft (Phase 2)"
  exit 1
fi

log "Phase 2 complete. Article: $ARTICLE_PATH"

# Quick frontmatter sanity check — enforce description length before Phase 3
DESC=$(sed -n 's/^description: *"\(.*\)"/\1/p' "$ARTICLE_PATH")
DESC_LEN=${#DESC}
if [ "$DESC_LEN" -gt 160 ]; then
  log "WARNING: Description is $DESC_LEN chars (max 160) — truncating"
  # Cut at last space before 157 chars, append "..."
  SHORT_DESC=$(echo "$DESC" | cut -c1-157 | sed 's/ [^ ]*$/.../')
  sed -i "s|^description: \".*\"|description: \"$SHORT_DESC\"|" "$ARTICLE_PATH"
  log "Description shortened to ${#SHORT_DESC} chars"
fi

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
# Auto-fix loop: if validation fails, Claude fixes errors and retries (max 2 attempts)
# ============================================================
log "Validating blog build..."
cd "$REPO_DIR/blog"

VALIDATION_PASSED=false
for ATTEMPT in 1 2 3; do
  VALIDATE_OUTPUT=$(npx astro sync 2>&1) && ASTRO_OK=true || ASTRO_OK=false
  echo "$VALIDATE_OUTPUT" | tee -a "$LOG_FILE"

  if [ "$ASTRO_OK" = "true" ]; then
    VALIDATION_PASSED=true
    break
  fi

  if [ "$ATTEMPT" -eq 3 ]; then
    log "ERROR: Astro validation still failing after 2 auto-fix attempts"
    break
  fi

  log "Validation failed (attempt $ATTEMPT/3) — running Claude auto-fix..."

  # Extract the error message for Claude
  VALIDATION_ERRORS=$(echo "$VALIDATE_OUTPUT" | grep -A2 -i "error" | head -10)

  cd "$REPO_DIR"
  claude -p "The blog article at $ARTICLE_PATH failed Astro validation with these errors:

$VALIDATION_ERRORS

Fix the article file to resolve these errors. Common fixes:
- description must be <= 160 characters (shorten it, keep meaning, aim for 130-150 chars)
- date must be YYYY-MM-DD format
- required frontmatter fields: title, description, date, tags, image, ogImage, status, readingTime

Only edit the file to fix the errors. Do not rewrite content." \
    --dangerously-skip-permissions \
    --max-turns 3 \
    2>&1 | tee -a "$LOG_FILE"

  cd "$REPO_DIR/blog"
  log "Auto-fix attempt $ATTEMPT complete. Re-validating..."
done

if [ "$VALIDATION_PASSED" != "true" ]; then
  report_failure "Build Validation (failed after auto-fix)"
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
IMG_PROMPT="Flat vector flow diagram on dark navy background (#0f172a) with subtle dot grid pattern overlay. Topic: ${TOPIC}. Use rounded pill-shaped boxes in steel blue (#4a8ecb) with soft shadows, connected by thin arrows. 2-4 labeled elements showing a simple relationship or flow. Large readable white text labels. Centered composition with lots of whitespace. Style: polished Figma mockup, NOT realistic 3D icons, NOT wireframes, NOT text-heavy. No gradients, no glow effects."
"$SCRIPT_DIR/generate-cover.sh" "$SLUG" "$IMG_PROMPT" 2>&1 | tee -a "$LOG_FILE" || log "WARNING: Cover image generation failed"

# Regenerate llms.txt with all published articles
log "Regenerating llms.txt..."
{
  echo '# On-Chain Engineering Blog'
  echo ''
  echo '> Technical blog by Ethernal covering EVM internals, EIP/ERC explainers, L2 rollup architecture, smart contract security, and block explorer development.'
  echo ''
  echo '## Articles'
  echo ''
  for f in blog/src/content/blog/*.md blog/src/content/blog/*.mdx; do
    [ -f "$f" ] || continue
    if awk 'BEGIN{c=0} /^---$/{c++} c==1 && /status: published/{found=1} END{exit !found}' "$f"; then
      ATITLE=$(awk 'BEGIN{c=0} /^---$/{c++} c==1 && /^title:/{gsub(/^title: *"?/,""); gsub(/"$/,""); print; exit}' "$f")
      ADESC=$(awk 'BEGIN{c=0} /^---$/{c++} c==1 && /^description:/{gsub(/^description: *"?/,""); gsub(/"$/,""); print; exit}' "$f")
      ASLUG=$(basename "$f" .md)
      ASLUG=$(basename "$ASLUG" .mdx)
      echo "- [${ATITLE}](https://tryethernal.com/blog/${ASLUG}): ${ADESC}"
    fi
  done
  echo ''
  echo '## About'
  echo ''
  echo '- [Ethernal](https://tryethernal.com): Open-source block explorer for EVM-based chains'
  echo '- [GitHub](https://github.com/tryethernal/ethernal): Source code repository'
  echo '- [Documentation](https://doc.tryethernal.com): Full product documentation'
} > blog/public/llms.txt

# Commit everything
git add "$ARTICLE_PATH" blog/public/llms.txt
[ -f "blog/public/images/${SLUG}.png" ] && git add "blog/public/images/${SLUG}.png" "blog/public/images/${SLUG}-og.png"
TITLE=$(head -5 "$ARTICLE_PATH" | grep '^title:' | sed 's/^title: *"//;s/"$//')
git commit -m "blog: publish - ${TITLE}" 2>&1 | tee -a "$LOG_FILE"
git push origin develop 2>&1 | tee -a "$LOG_FILE"

log "Pushed to develop."

# Update the project card
log "Updating project card..."
cd blog/pipeline
CARD_ID="$CARD_ID" ARTICLE_PATH="$ARTICLE_PATH" node --input-type=module -e "
  import { updateCardStatus, setArticlePath } from './project.js';
  updateCardStatus(process.env.CARD_ID, 'published');
  setArticlePath(process.env.CARD_ID, process.env.ARTICLE_PATH);
  console.log('Card updated: Published + article path set');
" 2>&1 | tee -a "$LOG_FILE"

# Clean up temp files
rm -f blog/pipeline/.research-notes.md blog/pipeline/.card-body.md

log "Done. Article deployed as draft: $ARTICLE_URL"

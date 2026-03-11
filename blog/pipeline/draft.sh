#!/usr/bin/env bash
# Blog draft automation — runs on Hetzner via systemd timer
# Picks the top trending topic, researches, drafts, and commits directly to develop
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
ENV_FILE="/opt/blog-pipeline.env"
MCP_CONFIG="$SCRIPT_DIR/mcp.json"
LOG_DIR="/var/log/blog-pipeline"
MAX_BUDGET=10

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

cd "$REPO_DIR"

# Research + Draft phase
# Claude writes the article with status: draft in frontmatter,
# commits directly to develop, and outputs the article path
log "Starting research and draft..."
CLAUDE_OUTPUT=$(claude -p "$(cat <<PROMPT
You are writing a blog article for the Ethernal blog (On-Chain Engineering).

A trending topic has been detected by our pipeline. Here is the full trend card:

**Topic:** $TOPIC
**Content Type:** $CONTENT_TYPE

**Trend Card Content:**
$CARD_BODY

Steps:
1. Run /blog:research for this topic. Focus on the specific EIPs, ERCs, papers, and forum posts listed — those are the primary sources.
2. Run /blog:draft to write the article. Use the Content Type to determine the format:
   - "ERC Tutorial": Code-heavy, include working Solidity, deploy instructions, practical examples
   - "EIP Explainer": What it changes, why it matters, code impact with before/after examples
   - "Research Deep Dive": Break down the paper/proposal, extract practical insights, include code snippets
   - "Upgrade Guide": Step-by-step migration guide with code changes needed
   - "Trend Survey": Survey multiple related proposals, compare approaches, include interface examples
   Cite the sources from the trend card as references in the article.
3. IMPORTANT: Set the article frontmatter status to "draft" (not "published").
4. Commit the article directly to the current branch (develop) with message "blog: add draft — <article title>".
5. Push to origin develop.
6. After pushing, output the article file path relative to the repo root on a line starting with "::article-path::"
   Example: ::article-path::blog/src/content/blog/my-article.md
PROMPT
)" \
  --dangerously-skip-permissions \
  --mcp-config "$MCP_CONFIG" \
  --max-turns 50 \
  --max-budget-usd "$MAX_BUDGET" \
  2>&1)

echo "$CLAUDE_OUTPUT" | tee -a "$LOG_FILE"

# Extract article path from Claude output
ARTICLE_PATH=$(echo "$CLAUDE_OUTPUT" | grep '::article-path::' | sed 's/::article-path:://' | head -1)

if [ -n "$ARTICLE_PATH" ]; then
  log "Article path: $ARTICLE_PATH"

  # Derive the blog URL slug from the file path
  # e.g. blog/src/content/blog/my-article.md → my-article
  SLUG=$(basename "$ARTICLE_PATH" .md)
  SLUG=$(basename "$SLUG" .mdx)
  ARTICLE_URL="https://tryethernal.com/blog/$SLUG"

  # Update the project card: set article path, move to Drafting
  log "Updating project card..."
  cd blog/pipeline
  node -e "
    import { updateCardStatus, setArticlePath } from './project.js';
    updateCardStatus('$CARD_ID', 'drafting');
    setArticlePath('$CARD_ID', '$ARTICLE_PATH');
    console.log('Card updated: Drafting + article path set');
  " --input-type=module 2>&1 | tee -a "$LOG_FILE"

  log "Done. Article deployed as draft: $ARTICLE_URL"
else
  log "WARNING: Could not extract article path from Claude output"
fi

#!/usr/bin/env bash
# Blog draft automation — runs on Hetzner via systemd timer
# Picks the top trending topic, researches, drafts, and commits directly to develop
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
ENV_FILE="${BLOG_PIPELINE_ENV:-/opt/blog-pipeline.env}"
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

# Move card to Researched before Claude run to block duplicate picks
CARD_ID="$CARD_ID" node --input-type=module -e "
  import { updateCardStatus } from './project.js';
  updateCardStatus(process.env.CARD_ID, 'researched');
  console.log('Card moved to Researched');
" 2>&1 | tee -a "$LOG_FILE"

cd "$REPO_DIR"

# Research + Draft phase
# Claude writes the article with status: draft in frontmatter,
# commits directly to develop, and outputs the article path
log "Starting research and draft..."

# Write prompt to temp file to avoid heredoc delimiter injection via $CARD_BODY
PROMPT_FILE=$(mktemp)
cat > "$PROMPT_FILE" <<'CLAUDE_PROMPT_EOF'
You are an autonomous blog writer for the Ethernal blog (On-Chain Engineering).
You MUST complete all steps without asking for confirmation. Do NOT stop to ask questions or present outlines for approval. Execute everything end-to-end.

Read `blog/pipeline/.card-body.md` for the topic and sources to research.

## Phase 1: Research

1. Read `.agents/product-marketing-context.md` for product messaging context.
2. Read 2-3 existing articles in `blog/src/content/blog/` to match tone (practical, tutorial-like, direct, slightly informal).
3. Use WebSearch and WebFetch to research the specific EIPs, ERCs, papers, and forum posts listed in the card body. For each source, extract core concepts, code examples, and key facts.

## Phase 2: Write

4. Write the article (1200-1800 words). Use the Content Type from the card to determine format:
   - "ERC Tutorial": Code-heavy, working Solidity, deploy instructions, practical examples
   - "EIP Explainer": What it changes, why it matters, before/after code examples
   - "Research Deep Dive": Break down proposals, extract practical insights, code snippets
   - "Upgrade Guide": Step-by-step migration with code changes
   - "Trend Survey": Survey related proposals, compare approaches, interface examples
5. Structure: hook, context, problem, solution, Ethernal angle (natural, not forced), CTA.
6. Include code snippets with language-tagged blocks where relevant.
7. Add a References footer section with numbered links to all cited sources (EIPs, docs, papers).
8. Zero em dashes. Use commas, periods, colons, or parentheses instead.
9. Quote recognized Ethereum figures where relevant (Vitalik, core devs, auditors, protocol authors).

## Phase 3: Save and Publish

10. Save to `blog/src/content/blog/<slug>.md` with this frontmatter:
    ```yaml
    ---
    title: "Article Title"
    description: "110-160 chars. Concise summary for SEO."
    date: YYYY-MM-DD
    tags:
      - Tag1
      - Tag2
    image: "/blog/images/<slug>.png"
    ogImage: "/blog/images/<slug>-og.png"
    status: draft
    readingTime: N
    ---
    ```
    description MUST be 110-160 characters (Zod enforced max 160).

11. Skip image generation (will be done separately).

12. Commit: `git add blog/src/content/blog/<slug>.md && git commit -m "blog: add draft — <title>"`
13. Push: `git push origin develop`
14. Output the file path on a line: `::article-path::blog/src/content/blog/<slug>.md`

IMPORTANT: Do NOT ask for confirmation at any step. Complete everything autonomously.
CLAUDE_PROMPT_EOF

# Write card body to file for Claude to read (avoids shell interpolation)
printf '**Topic:** %s\n**Content Type:** %s\n\n%s' "$TOPIC" "$CONTENT_TYPE" "$CARD_BODY" > blog/pipeline/.card-body.md

CLAUDE_OUTPUT=$(claude -p "$(cat "$PROMPT_FILE")" \
  --dangerously-skip-permissions \
  --mcp-config "$MCP_CONFIG" \
  --max-turns 50 \
  --max-budget-usd "$MAX_BUDGET" \
  2>&1)
rm -f "$PROMPT_FILE"

echo "$CLAUDE_OUTPUT" | tee -a "$LOG_FILE"

# Extract article path from Claude output
ARTICLE_PATH=$(echo "$CLAUDE_OUTPUT" | grep '::article-path::' | sed 's/::article-path:://' | head -1)

if [ -z "$ARTICLE_PATH" ]; then
  log "WARNING: Could not extract article path — resetting card to Detected"
  cd blog/pipeline
  CARD_ID="$CARD_ID" node --input-type=module -e "
    import { updateCardStatus } from './project.js';
    updateCardStatus(process.env.CARD_ID, 'detected');
    console.log('Card reset to Detected');
  " 2>&1 | tee -a "$LOG_FILE"
  exit 1
fi

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
  CARD_ID="$CARD_ID" ARTICLE_PATH="$ARTICLE_PATH" node --input-type=module -e "
    import { updateCardStatus, setArticlePath } from './project.js';
    updateCardStatus(process.env.CARD_ID, 'drafting');
    setArticlePath(process.env.CARD_ID, process.env.ARTICLE_PATH);
    console.log('Card updated: Drafting + article path set');
  " 2>&1 | tee -a "$LOG_FILE"

  log "Done. Article deployed as draft: $ARTICLE_URL"
fi

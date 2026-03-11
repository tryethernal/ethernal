#!/usr/bin/env bash
# Blog draft automation — runs on Hetzner via systemd timer
# Picks the top trending topic and runs research + draft via Claude CLI
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

# Research phase — pass the full card body as context
log "Starting research..."
claude -p "$(cat <<PROMPT
You are writing a blog article for the Ethernal blog (On-Chain Engineering).

A trending topic has been detected by our pipeline. Here is the full trend card:

**Topic:** $TOPIC
**Content Type:** $CONTENT_TYPE

**Trend Card Content:**
$CARD_BODY

Based on the sources listed above, run /blog:research to deeply research this topic.
Focus on the specific EIPs, ERCs, papers, and forum posts listed — those are the primary sources.
PROMPT
)" \
  --dangerously-skip-permissions \
  --mcp-config "$MCP_CONFIG" \
  --max-turns 50 \
  --max-budget-usd "$MAX_BUDGET" \
  2>&1 | tee -a "$LOG_FILE"

# Draft phase — uses research context from --resume, plus explicit instructions
log "Starting draft..."
claude -p "$(cat <<PROMPT
Continue with the research you just completed on "$TOPIC".

Run /blog:draft to write the full article with these parameters:
- **Content Type:** $CONTENT_TYPE
  - "ERC Tutorial": Code-heavy, include working Solidity, deploy instructions, practical examples
  - "EIP Explainer": What it changes, why it matters, code impact with before/after examples
  - "Research Deep Dive": Break down the paper/proposal, extract practical insights, include code snippets
  - "Upgrade Guide": Step-by-step migration guide with code changes needed
  - "Trend Survey": Survey multiple related proposals, compare approaches, include interface examples
- **Sources to cite:** Use the EIPs, ERCs, papers, and forum posts from the research phase as references

After writing:
1. Create a git branch named blog/$TOPIC (slugified)
2. Create a PR targeting develop
3. After the PR is created, output the PR URL so it can be tracked
PROMPT
)" \
  --dangerously-skip-permissions \
  --mcp-config "$MCP_CONFIG" \
  --max-turns 50 \
  --max-budget-usd "$MAX_BUDGET" \
  --resume \
  2>&1 | tee -a "$LOG_FILE"

log "Done. Check for new PR."

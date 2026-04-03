#!/usr/bin/env bash
# Deploy tweet pipeline to Hetzner server as standalone directory
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
SERVER="root@157.90.154.200"

echo "Deploying tweet pipeline to $SERVER:/opt/tweet-pipeline/..."

rsync -avz --delete \
  --exclude='.promoted-articles' \
  --exclude='.newsletter-source.json' \
  --exclude='.blog-candidate.json' \
  --exclude='.processed-threads' \
  --exclude='.source.json' \
  --exclude='.research.md' \
  --exclude='.draft.json' \
  --exclude='.audit.json' \
  --exclude='node_modules' \
  --exclude='state.db' \
  --exclude='state.db-wal' \
  --exclude='state.db-shm' \
  "$SCRIPT_DIR/" "$SERVER:/opt/tweet-pipeline/"

# CRITICAL: fix ownership after rsync (rsync as root creates root-owned files,
# which breaks git pull in /opt/ethernal-blog-stack when blog user runs the blog pipeline)
echo "Fixing file ownership..."
ssh "$SERVER" "chown -R blog:blog /opt/tweet-pipeline/"

echo "Installing dependencies..."
ssh "$SERVER" "sudo -u blog bash -c 'cd /opt/tweet-pipeline && npm ci --silent && npx playwright install chromium --with-deps'"

echo "Done. Run the following on the server to update systemd units:"
echo "  ssh $SERVER 'cp /opt/tweet-pipeline/*.service /opt/tweet-pipeline/*.timer /etc/systemd/system/ && systemctl daemon-reload'"

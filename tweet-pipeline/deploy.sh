#!/usr/bin/env bash
# Deploy tweet pipeline to Hetzner server as standalone directory
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "Deploying tweet pipeline to 157.90.154.200:/opt/tweet-pipeline/..."

rsync -avz --delete \
  --exclude='.promoted-articles' \
  --exclude='.newsletter-source.json' \
  --exclude='.blog-candidate.json' \
  --exclude='.processed-threads' \
  --exclude='.source.json' \
  --exclude='.research.md' \
  --exclude='.draft.json' \
  --exclude='node_modules' \
  --exclude='state.db' \
  --exclude='state.db-wal' \
  --exclude='state.db-shm' \
  "$SCRIPT_DIR/" blog@157.90.154.200:/opt/tweet-pipeline/

echo "Installing dependencies..."
ssh blog@157.90.154.200 "cd /opt/tweet-pipeline && npm ci --silent && npx playwright install chromium --with-deps"

echo "Done. Run the following on the server to update systemd units:"
echo "  cp /opt/tweet-pipeline/*.service /opt/tweet-pipeline/*.timer ~/.config/systemd/user/"
echo "  systemctl --user daemon-reload"
echo "  systemctl --user restart tweet-draft.timer tweet-publish.timer tweet-engagement.timer scan-newsletter.timer"

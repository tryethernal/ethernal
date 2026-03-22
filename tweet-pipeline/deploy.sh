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
  "$SCRIPT_DIR/" root@157.90.154.200:/opt/tweet-pipeline/

# CRITICAL: fix ownership after rsync (rsync as root creates root-owned files,
# which breaks git pull in /opt/ethernal-blog-stack when blog user runs the blog pipeline)
echo "Fixing file ownership..."
ssh root@157.90.154.200 "chown -R blog:blog /opt/tweet-pipeline/"

echo "Installing dependencies..."
ssh root@157.90.154.200 "sudo -u blog bash -c 'cd /opt/tweet-pipeline && npm ci --silent && npx playwright install chromium --with-deps'"

echo "Done. Run the following on the server to update systemd units:"
echo "  ssh root@157.90.154.200 'cp /opt/tweet-pipeline/*.service /opt/tweet-pipeline/*.timer /etc/systemd/system/ && systemctl daemon-reload'"

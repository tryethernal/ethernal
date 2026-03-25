#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
source /opt/prospecting-pipeline.env 2>/dev/null || true
exec node run.js 2>&1 | tee -a /var/log/prospecting-pipeline/run-$(date +%Y%m%d-%H%M%S).log

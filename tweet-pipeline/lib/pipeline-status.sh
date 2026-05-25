#!/usr/bin/env bash
# Shared pipeline status check for tweet-pipeline scripts.
#
# Source this file at the top of every timer-driven script (after `set -e`
# and after defining `log()`). When the pipeline is disabled, all
# entrypoint scripts exit cleanly without doing any work, calling the
# Twitter API, or filing GitHub issues.
#
# Two ways to disable:
#
# 1. PIPELINE_DISABLED env var set to "1" in /opt/blog-pipeline.env.
#    Preferred: lets ops re-enable by editing one line on the server.
#
# 2. PIPELINE_DISABLED_AT_REPO=1 below. Repo-controlled kill switch —
#    flip this and deploy.sh to deactivate the entire pipeline from a
#    commit without needing server-side env edits. Currently set to 1
#    because the Twitter account is out of credits and the pipeline is
#    not being kept active. Revert this commit to reactivate.
#
# If either is set, the calling script logs a message and exits 0.

PIPELINE_DISABLED_AT_REPO=1

if [ "${PIPELINE_DISABLED:-0}" = "1" ] || [ "${PIPELINE_DISABLED_AT_REPO:-0}" = "1" ]; then
  # Pick a reasonable name even if the caller didn't define one.
  SCRIPT_NAME="${0##*/}"
  REASON="disabled at repo level (PIPELINE_DISABLED_AT_REPO=1)"
  if [ "${PIPELINE_DISABLED:-0}" = "1" ]; then
    REASON="disabled via PIPELINE_DISABLED env var"
  fi

  if command -v log >/dev/null 2>&1; then
    log "Tweet pipeline is $REASON — skipping $SCRIPT_NAME run."
  else
    echo "[$(date -Iseconds)] Tweet pipeline is $REASON — skipping $SCRIPT_NAME run."
  fi
  exit 0
fi

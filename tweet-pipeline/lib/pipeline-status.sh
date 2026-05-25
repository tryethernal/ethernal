#!/usr/bin/env bash
# Shared pipeline status check for tweet-pipeline scripts.
#
# Source this file at the top of every timer-driven script. When the
# pipeline is disabled, all entrypoint scripts exit cleanly without
# doing any filesystem work, calling the Twitter API, or filing GitHub
# issues.
#
# Two ways to disable, in order of precedence:
#
# 1. PIPELINE_DISABLED_AT_REPO=1 below. Repo-controlled kill switch —
#    flip this and deploy to deactivate the entire pipeline from a
#    commit, without needing server-side env edits. Currently set to 1
#    because the Twitter account is out of credits and the pipeline is
#    not being kept active. Revert this commit to reactivate.
#
# 2. PIPELINE_DISABLED=1 in /opt/blog-pipeline.env. Server-side toggle
#    for ops. To make this work, the calling script must `source` the
#    env file BEFORE sourcing this kill-switch (e.g. by passing
#    `PIPELINE_DISABLED=1 bash script.sh` or by inlining the env load
#    above this source line). Most scripts source the env file later in
#    their setup for legitimate reasons (DB paths, Twitter keys), so the
#    env-file toggle is a secondary path that requires re-ordering on
#    the caller side if ever needed. For now, the repo-level flag is
#    the canonical off switch.
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

  # If the caller has already defined log(), use it; otherwise inline an
  # echo so this lib remains self-contained when sourced very early.
  if command -v log >/dev/null 2>&1; then
    log "Tweet pipeline is $REASON — skipping $SCRIPT_NAME run."
  else
    echo "[$(date -Iseconds)] Tweet pipeline is $REASON — skipping $SCRIPT_NAME run."
  fi
  exit 0
fi

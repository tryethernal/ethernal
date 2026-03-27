#!/usr/bin/env bash
# Shared failure reporting for tweet pipeline scripts.
# Deduplicates: if an open issue with the same title exists, adds a comment
# with the occurrence count instead of creating a new issue.
#
# Usage: source this file, then call report_failure "phase description"
# Requires: FAILURE_TITLE_PREFIX (e.g., "Tweet pipeline failed")
#           LOG_FILE (path to current log file)

FAILURE_REPORTED=false

report_failure() {
  [ "$FAILURE_REPORTED" = true ] && return
  FAILURE_REPORTED=true
  local phase="$1"
  local log_tail
  log_tail=$(tail -50 "$LOG_FILE" 2>/dev/null || echo "No log available")
  local title="${FAILURE_TITLE_PREFIX}: $phase"

  # Check for existing open issue with the same title
  local existing_issue
  existing_issue=$(gh issue list \
    --repo tryethernal/ethernal \
    --state open \
    --label "tweet-pipeline" \
    --search "$title in:title" \
    --json number,title \
    --jq ".[] | select(.title == \"$title\") | .number" \
    2>/dev/null | head -1)

  if [ -n "$existing_issue" ]; then
    # Count existing comments to track occurrences
    local comment_count
    comment_count=$(gh api "repos/tryethernal/ethernal/issues/${existing_issue}/comments" \
      --jq 'length' 2>/dev/null || echo "0")
    local occurrence=$((comment_count + 2))  # +1 for original, +1 for this one

    gh issue comment "$existing_issue" \
      --repo tryethernal/ethernal \
      --body "$(cat <<EOF
## Occurrence #${occurrence}

**Date:** $(date -Iseconds)
**Log file:** \`$LOG_FILE\`

### Last 50 lines of log

\`\`\`
$log_tail
\`\`\`
EOF
)" 2>&1 | tee -a "$LOG_FILE" || log "WARNING: Failed to comment on GitHub issue #$existing_issue"
  else
    # No existing issue — create new one
    gh issue create \
      --repo tryethernal/ethernal \
      --title "$title" \
      --label "tweet-pipeline" \
      --body "$(cat <<EOF
## ${FAILURE_TITLE_PREFIX}

**Phase:** $phase
**Date:** $(date -Iseconds)
**Log file:** \`$LOG_FILE\`

### Last 50 lines of log

\`\`\`
$log_tail
\`\`\`
EOF
)" 2>&1 | tee -a "$LOG_FILE" || log "WARNING: Failed to create GitHub issue"
  fi
}

#!/usr/bin/env bash
# External watchdog for Ethernal workers.
# Runs on Hetzner (157.90.154.200) via systemd timer every 90s.
# Checks API health, worker heartbeats, and queue drain.
# On 2 consecutive failures, triggers Claude CLI diagnosis.
#
# Required env vars (from /home/blog/.watchdog.env):
#   REDIS_URL, OPSGENIE_API_KEY, FLY_API_TOKEN, GH_TOKEN

set -euo pipefail

STATE_FILE="/tmp/ethernal-watchdog-state.json"
LOG_FILE="/var/log/ethernal-watchdog/watchdog.log"
DIAGNOSE_PROMPT="/opt/ethernal/scripts/watchdog-diagnose.md"
MAX_ROLLBACKS_PER_HOUR=1
HEARTBEAT_STALE_THRESHOLD_S=60
CONSECUTIVE_FAILURES_THRESHOLD=2

log() { echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) $1" | tee -a "$LOG_FILE"; }

# Initialize state file if missing
if [ ! -f "$STATE_FILE" ]; then
    echo '{"consecutive_failures":0,"last_failure":"","last_rollback":"","last_diagnosis":""}' > "$STATE_FILE"
fi

read_state() { python3 -c "import json; d=json.load(open('$STATE_FILE')); print(d.get('$1',''))"; }
write_state() { python3 -c "import json; d=json.load(open('$STATE_FILE')); d['$1']='$2'; json.dump(d,open('$STATE_FILE','w'))"; }
inc_failures() { python3 -c "import json; d=json.load(open('$STATE_FILE')); d['consecutive_failures']=d.get('consecutive_failures',0)+1; json.dump(d,open('$STATE_FILE','w')); print(d['consecutive_failures'])"; }
reset_failures() { python3 -c "import json; d=json.load(open('$STATE_FILE')); d['consecutive_failures']=0; json.dump(d,open('$STATE_FILE','w'))"; }

FAILED=0

# --- Check 1: API health ---
log "Checking API health..."
if ! curl -sf --max-time 10 "https://app.tryethernal.com/api/status/health" > /dev/null 2>&1; then
    log "FAIL: API health check failed"
    FAILED=1
fi

# --- Check 2: Worker heartbeats ---
if [ "$FAILED" -eq 0 ]; then
    log "Checking worker heartbeats..."
    NOW_MS=$(date +%s%3N 2>/dev/null || python3 -c "import time; print(int(time.time()*1000))")

    for WORKER_TYPE in highPriority mediumPriority lowPriority; do
        # Get all heartbeat keys for this worker type
        KEYS=$(redis-cli -u "$REDIS_URL" --no-auth-warning KEYS "ethernal:worker:${WORKER_TYPE}:heartbeat:*" 2>/dev/null)
        if [ -z "$KEYS" ]; then
            log "FAIL: No heartbeat keys for ${WORKER_TYPE}"
            FAILED=1
            break
        fi

        ALL_STALE=1
        for KEY in $KEYS; do
            VAL=$(redis-cli -u "$REDIS_URL" --no-auth-warning GET "$KEY" 2>/dev/null)
            if [ -n "$VAL" ]; then
                TS=$(echo "$VAL" | python3 -c "import sys,json; print(json.load(sys.stdin)['timestamp'])")
                AGE_S=$(( (${NOW_MS%???} - ${TS%???}) ))
                if [ "$AGE_S" -le "$HEARTBEAT_STALE_THRESHOLD_S" ]; then
                    ALL_STALE=0
                    break
                fi
            fi
        done

        if [ "$ALL_STALE" -eq 1 ]; then
            log "FAIL: All heartbeats stale for ${WORKER_TYPE} (threshold: ${HEARTBEAT_STALE_THRESHOLD_S}s)"
            FAILED=1
            break
        fi
    done
fi

# --- Check 3: Queue drain ---
if [ "$FAILED" -eq 0 ]; then
    log "Checking queue drain..."
    WAITING=$(redis-cli -u "$REDIS_URL" --no-auth-warning LLEN "bull:blockSync:wait" 2>/dev/null || echo "0")
    ACTIVE=$(redis-cli -u "$REDIS_URL" --no-auth-warning LLEN "bull:blockSync:active" 2>/dev/null || echo "0")

    if [ "$WAITING" -gt 0 ] && [ "$ACTIVE" -eq 0 ]; then
        log "FAIL: Queue drain detected (waiting=$WAITING, active=$ACTIVE)"
        FAILED=1
    fi
fi

# --- Evaluate results ---
if [ "$FAILED" -eq 0 ]; then
    log "OK: All checks passed"
    reset_failures
    exit 0
fi

CONSECUTIVE=$(inc_failures)
write_state "last_failure" "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
log "Consecutive failures: $CONSECUTIVE / $CONSECUTIVE_FAILURES_THRESHOLD"

if [ "$CONSECUTIVE" -lt "$CONSECUTIVE_FAILURES_THRESHOLD" ]; then
    log "Below threshold, waiting for next check"
    exit 0
fi

# --- Trigger AI diagnosis ---
log "ALERT: Threshold reached. Triggering AI diagnosis..."

# Check rollback cooldown
LAST_ROLLBACK=$(read_state "last_rollback")
if [ -n "$LAST_ROLLBACK" ]; then
    LAST_EPOCH=$(date -d "$LAST_ROLLBACK" +%s 2>/dev/null || python3 -c "from datetime import datetime; print(int(datetime.fromisoformat('$LAST_ROLLBACK'.replace('Z','+00:00')).timestamp()))")
    NOW_EPOCH=$(date +%s)
    DIFF=$(( NOW_EPOCH - LAST_EPOCH ))
    if [ "$DIFF" -lt 3600 ]; then
        log "Rollback cooldown active (${DIFF}s since last rollback, need 3600s). Alerting only."
        # Send OpsGenie alert without rollback
        curl -sf -X POST "https://api.opsgenie.com/v2/alerts" \
            -H "Authorization: GenieKey ${OPSGENIE_API_KEY}" \
            -H "Content-Type: application/json" \
            -d "{\"message\":\"Workers unhealthy - rollback cooldown active\",\"description\":\"Consecutive failures: $CONSECUTIVE. Rollback on cooldown.\",\"priority\":\"P1\",\"tags\":[\"watchdog\"],\"alias\":\"watchdog-worker-crash\"}" \
            > /dev/null 2>&1 || true
        exit 1
    fi
fi

# Run Claude diagnosis
export FLY_API_TOKEN
export GH_TOKEN
DIAGNOSIS_OUTPUT="/tmp/ethernal-watchdog-diagnosis-$(date +%s).txt"

log "Running Claude CLI diagnosis..."
su - blog -c "claude -p '$DIAGNOSE_PROMPT' \
    --allowedTools 'Bash(fly logs:fly machines:fly releases:redis-cli:gh api:git log:curl)' \
    --max-turns 10 \
    --output-format text" \
    > "$DIAGNOSIS_OUTPUT" 2>&1 || true

DIAGNOSIS=$(cat "$DIAGNOSIS_OUTPUT" | tail -200)
log "Diagnosis complete. Output: $DIAGNOSIS_OUTPUT"

# Extract rollback decision from diagnosis (Claude writes ROLLBACK:yes or ROLLBACK:no)
if grep -q "ROLLBACK:yes" "$DIAGNOSIS_OUTPUT"; then
    # Get previous version
    PREV_VERSION=$(grep "ROLLBACK_VERSION:" "$DIAGNOSIS_OUTPUT" | head -1 | cut -d: -f2 | tr -d ' ')
    if [ -n "$PREV_VERSION" ]; then
        log "ROLLING BACK to $PREV_VERSION"
        flyctl deploy -a ethernal -i "registry.fly.io/ethernal:$PREV_VERSION" --strategy rolling 2>&1 | tee -a "$LOG_FILE" || true
        write_state "last_rollback" "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
        log "Rollback issued. Verifying in 120s..."
    fi
fi

# Send OpsGenie P1
curl -sf -X POST "https://api.opsgenie.com/v2/alerts" \
    -H "Authorization: GenieKey ${OPSGENIE_API_KEY}" \
    -H "Content-Type: application/json" \
    -d "$(python3 -c "
import json,sys
d = {
    'message': 'Worker crash detected - AI diagnosis triggered',
    'description': open('$DIAGNOSIS_OUTPUT').read()[:15000],
    'priority': 'P1',
    'tags': ['watchdog','worker-crash'],
    'alias': 'watchdog-worker-crash'
}
print(json.dumps(d))
")" > /dev/null 2>&1 || true

# Create GitHub issue with worker-crash label
ISSUE_BODY=$(python3 -c "
import json
body = '''## Worker Crash Auto-Diagnosis

**Detected at:** $(date -u +%Y-%m-%dT%H:%M:%SZ)
**Consecutive failures:** $CONSECUTIVE

### Diagnosis Output

\`\`\`
''' + open('$DIAGNOSIS_OUTPUT').read()[:60000] + '''
\`\`\`
'''
print(body)
")

gh issue create \
    --repo tryethernal/ethernal \
    --title "fix: [auto-remediation] worker crash detected $(date +%Y-%m-%d)" \
    --label "worker-crash" \
    --body "$ISSUE_BODY" \
    2>&1 | tee -a "$LOG_FILE" || true

reset_failures
log "Incident pipeline complete."

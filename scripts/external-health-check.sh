#!/bin/bash
# External health check for Ethernal API
# Runs on the Sentry server (157.90.154.200) via cron, every minute.
# Curls the /health endpoint and alerts via Discord + OpsGenie on failure.
#
# Install:
#   1. Create /opt/ethernal-health-check.env on the server with:
#        DISCORD_CRITICAL_WEBHOOK=https://discord.com/api/webhooks/...
#        OPSGENIE_API_KEY=your-key-here
#   2. scp scripts/external-health-check.sh root@157.90.154.200:/opt/ethernal-health-check.sh
#   3. ssh root@157.90.154.200 "chmod +x /opt/ethernal-health-check.sh"
#   4. Add to crontab:
#        * * * * * . /opt/ethernal-health-check.env && /opt/ethernal-health-check.sh >> /var/log/ethernal-health-check.log 2>&1

HEALTH_URL="https://api.tryethernal.com/api/status/health"
DISCORD_WEBHOOK="${DISCORD_CRITICAL_WEBHOOK:?Set DISCORD_CRITICAL_WEBHOOK env var}"
OPSGENIE_API_KEY="${OPSGENIE_API_KEY:?Set OPSGENIE_API_KEY env var}"
STATE_FILE="/tmp/ethernal-health-state"
TIMEOUT=10

# Escape special JSON characters in a string
json_escape() {
    printf '%s' "$1" | python3 -c 'import json,sys; print(json.dumps(sys.stdin.read()), end="")'
}

# Curl the health endpoint
HTTP_CODE=$(curl -s -o /tmp/ethernal-health-response.json -w "%{http_code}" --max-time $TIMEOUT "$HEALTH_URL" 2>/dev/null)
CURL_EXIT=$?
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

# Determine status
if [ $CURL_EXIT -ne 0 ]; then
    STATUS="unreachable"
    DETAILS="curl failed with exit code $CURL_EXIT (timeout or connection error)"
elif [ "$HTTP_CODE" = "503" ]; then
    STATUS="unhealthy"
    DETAILS=$(cat /tmp/ethernal-health-response.json 2>/dev/null || echo "no response body")
elif [ "$HTTP_CODE" != "200" ]; then
    STATUS="unexpected"
    DETAILS="HTTP $HTTP_CODE — $(cat /tmp/ethernal-health-response.json 2>/dev/null || echo 'no response body')"
else
    STATUS="healthy"
fi

# Read previous state
PREV_STATE=$(cat "$STATE_FILE" 2>/dev/null || echo "healthy")

# Write current state
echo "$STATUS" > "$STATE_FILE"

# If healthy, check if we're recovering from failure
if [ "$STATUS" = "healthy" ]; then
    if [ "$PREV_STATE" != "healthy" ]; then
        # Recovery: send recovery notification
        curl -s -X POST "$DISCORD_WEBHOOK" \
            -H "Content-Type: application/json" \
            -d "{\"content\":\"**[RECOVERED]** Ethernal API health check is back to healthy.\\nPrevious state: \`$PREV_STATE\`\\nTimestamp: $TIMESTAMP\"}" \
            > /dev/null 2>&1

        # Close OpsGenie alert
        curl -s -X POST "https://api.opsgenie.com/v2/alerts/ethernal-api-external-health/close?identifierType=alias" \
            -H "Content-Type: application/json" \
            -H "Authorization: GenieKey $OPSGENIE_API_KEY" \
            -d "{\"note\":\"Health check recovered at $TIMESTAMP\"}" \
            > /dev/null 2>&1
    fi
    exit 0
fi

# Failure path: only alert on state transition (not every minute)
if [ "$PREV_STATE" = "healthy" ]; then
    echo "[$TIMESTAMP] ALERT: $STATUS — $DETAILS"

    SAFE_DETAILS=$(json_escape "$DETAILS")

    # Discord critical webhook
    curl -s -X POST "$DISCORD_WEBHOOK" \
        -H "Content-Type: application/json" \
        -d "{\"content\":\"**[CRITICAL]** Ethernal API health check failed!\\nStatus: \`$STATUS\`\\nDetails: $SAFE_DETAILS\\nEndpoint: $HEALTH_URL\\nTimestamp: $TIMESTAMP\\nSource: external check (Sentry server)\"}" \
        > /dev/null 2>&1

    # OpsGenie alert
    curl -s -X POST "https://api.opsgenie.com/v2/alerts" \
        -H "Content-Type: application/json" \
        -H "Authorization: GenieKey $OPSGENIE_API_KEY" \
        -d "{
            \"message\": \"Ethernal API unreachable (external health check)\",
            \"alias\": \"ethernal-api-external-health\",
            \"description\": \"External health check from Sentry server failed.\\nStatus: $STATUS\\nDetails: $SAFE_DETAILS\\nTimestamp: $TIMESTAMP\",
            \"priority\": \"P1\",
            \"tags\": [\"infra\", \"external-health\"]
        }" \
        > /dev/null 2>&1
else
    # Already alerted, just log
    echo "[$TIMESTAMP] Still $STATUS — $DETAILS (already alerted)"
fi

#!/usr/bin/env bash
# Redis health diagnostic script
# Usage: bash scripts/redis-health.sh [redis-url]

set -euo pipefail

REDIS_URL="${1:-${REDIS_URL:?'REDIS_URL env var or argument required (e.g. redis://user:pass@host:6379)'}}"

echo "=== Redis Health Check ==="
echo "Target: $(echo "$REDIS_URL" | sed 's/:.*@/:***@/')"
echo ""

echo "--- Memory ---"
redis-cli -u "$REDIS_URL" INFO memory | grep -E "used_memory_human|maxmemory_human|mem_fragmentation_ratio|used_memory_peak_human"
echo ""

echo "--- Memory Usage % ---"
USED=$(redis-cli -u "$REDIS_URL" INFO memory | grep "used_memory:" | cut -d: -f2 | tr -d '\r')
MAX=$(redis-cli -u "$REDIS_URL" INFO memory | grep "maxmemory:" | cut -d: -f2 | tr -d '\r')
if [ "$MAX" -gt 0 ] 2>/dev/null; then
    PCT=$(echo "scale=1; $USED * 100 / $MAX" | bc)
    echo "Memory: ${PCT}% used (${USED} / ${MAX} bytes)"
else
    echo "Memory: maxmemory not set or zero"
fi
echo ""

echo "--- Key Distribution (top 10 prefixes) ---"
redis-cli -u "$REDIS_URL" --scan --pattern 'bull:*' | sed 's/:[^:]*$//' | sort | uniq -c | sort -rn | head -10
echo ""

echo "--- Queue Sizes (waiting + failed) ---"
for queue in blockSync processBlock receiptSync processContract processTokenTransfer processTransactionTrace; do
    WAITING=$(redis-cli -u "$REDIS_URL" LLEN "bull:${queue}:wait" 2>/dev/null || echo "0")
    FAILED=$(redis-cli -u "$REDIS_URL" ZCARD "bull:${queue}:failed" 2>/dev/null || echo "0")
    if [ "$WAITING" != "0" ] || [ "$FAILED" != "0" ]; then
        echo "  ${queue}: waiting=${WAITING} failed=${FAILED}"
    fi
done
echo ""

echo "--- Connected Clients ---"
redis-cli -u "$REDIS_URL" INFO clients | grep -E "connected_clients|blocked_clients"
echo ""

echo "=== Done ==="

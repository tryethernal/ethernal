# Worker Crash Alerting Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Detect worker crash-loops from outside the blast radius, auto-rollback via AI diagnosis, and trigger auto-fix PRs.

**Architecture:** External watchdog on Hetzner (systemd timer, 90s) checks API health, Redis worker heartbeats, and queue drain. On failure, Claude CLI diagnoses and rolls back. GitHub issue with `worker-crash` label triggers the existing `sentry-auto-fix.yml` to create a fix PR.

**Tech Stack:** Bash (watchdog), Node.js (heartbeats), BullMQ/Redis, Fly CLI, Claude CLI, GitHub Actions (claude-code-action)

**Key files to understand before starting:**
- `run/workers/highPriority.js` — worker startup, needs heartbeat addition
- `run/lib/redis.js` — shared Redis connection (reuse for heartbeat writes)
- `run/lib/opsgenie.js` — OpsGenie alert creation pattern
- `.github/workflows/sentry-auto-fix.yml` — existing auto-fix workflow to expand
- `scripts/redis-health.sh` — reference for Redis CLI scripting patterns
- Memory: `~/.claude/projects/-Users-antoine-ethernal-ethernal/memory/blog-pipeline-server.md` — Hetzner Claude CLI setup
- Memory: `~/.claude/projects/-Users-antoine-ethernal-ethernal/memory/infra-monitoring.md` — Redis URL, OpsGenie key, Discord webhooks

**Hetzner server:** `157.90.154.200` (ssh root@). Claude CLI installed at `/usr/bin/claude` (runs as `blog` user). `gh` CLI installed. Fly CLI NOT installed (needs install). Blog pipeline runs as `blog` user with `apiKeyHelper` auth.

**Redis URL:** `redis://default:TismjYcWA0vNmR2ds1N2DVaak1daZkrP@redisprod.tryethernal.com:6379`
**NEVER hardcode credentials in committed files.** Use env vars loaded from `/home/blog/.watchdog.env` on the server.

---

### Task 1: Add Worker Heartbeats to Redis

**Files:**
- Create: `run/lib/heartbeat.js`
- Modify: `run/workers/highPriority.js:14` (after imports)
- Modify: `run/workers/mediumPriority.js:14` (after imports)
- Modify: `run/workers/lowPriority.js:14` (after imports)

**Step 1: Create heartbeat module**

Create `run/lib/heartbeat.js`:

```javascript
/**
 * @fileoverview Worker heartbeat writer.
 * Writes a periodic heartbeat to Redis so external monitors can detect dead workers.
 * @module lib/heartbeat
 */

const connection = require('./redis');
const logger = require('./logger');

const HEARTBEAT_INTERVAL_MS = 30000;
const HEARTBEAT_TTL_S = 120;

/**
 * Starts writing heartbeats to Redis for this worker process.
 * Key: ethernal:worker:{workerType}:heartbeat:{machineId}
 * Value: JSON { timestamp, pid, machineId }
 * TTL: 120s (auto-expires if worker dies)
 * @param {string} workerType - e.g. 'highPriority', 'mediumPriority', 'lowPriority'
 */
function startHeartbeat(workerType) {
    const machineId = process.env.FLY_MACHINE_ID || 'local';
    const key = `ethernal:worker:${workerType}:heartbeat:${machineId}`;

    const write = async () => {
        try {
            const value = JSON.stringify({
                timestamp: Date.now(),
                pid: process.pid,
                machineId
            });
            await connection.set(key, value, 'EX', HEARTBEAT_TTL_S);
        } catch (err) {
            logger.error(`Heartbeat write failed for ${workerType}: ${err.message}`);
        }
    };

    write();
    setInterval(write, HEARTBEAT_INTERVAL_MS);
    logger.info(`Heartbeat started for worker "${workerType}" (key: ${key})`);
}

module.exports = { startHeartbeat };
```

**Step 2: Add heartbeat to each worker file**

In `run/workers/highPriority.js`, add after line 17 (after `managedWorkerError` require):

```javascript
const { startHeartbeat } = require('../lib/heartbeat');
startHeartbeat('highPriority');
```

In `run/workers/mediumPriority.js`, same position:

```javascript
const { startHeartbeat } = require('../lib/heartbeat');
startHeartbeat('mediumPriority');
```

In `run/workers/lowPriority.js`, same position:

```javascript
const { startHeartbeat } = require('../lib/heartbeat');
startHeartbeat('lowPriority');
```

**Step 3: Verify locally**

```bash
docker compose -f docker-compose.dev.yml exec server node -e "
const heartbeat = require('./lib/heartbeat');
const redis = require('./lib/redis');
heartbeat.startHeartbeat('test');
setTimeout(async () => {
  const val = await redis.get('ethernal:worker:test:heartbeat:local');
  console.log('Heartbeat value:', val);
  process.exit(val ? 0 : 1);
}, 2000);
"
```
Expected: `Heartbeat value: {"timestamp":...,"pid":...,"machineId":"local"}`

**Step 4: Commit**

```bash
git add run/lib/heartbeat.js run/workers/highPriority.js run/workers/mediumPriority.js run/workers/lowPriority.js
git commit -m "feat: add worker heartbeat writes to Redis for external monitoring"
```

---

### Task 2: Create Watchdog Script

**Files:**
- Create: `scripts/watchdog.sh`

**Step 1: Write the watchdog script**

Create `scripts/watchdog.sh`:

```bash
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
```

**Step 2: Commit**

```bash
chmod +x scripts/watchdog.sh
git add scripts/watchdog.sh
git commit -m "feat: add external watchdog script for worker crash detection"
```

---

### Task 3: Create Claude Diagnosis Prompt

**Files:**
- Create: `scripts/watchdog-diagnose.md`

**Step 1: Write the diagnosis prompt**

Create `scripts/watchdog-diagnose.md`:

````markdown
You are diagnosing a production worker crash on Ethernal (Fly.io app: ethernal).

Workers are not processing jobs. Your job is to:
1. Determine the root cause
2. Decide if a rollback will fix it
3. Output a structured decision

## Step 1: Gather evidence

Run these commands:
- `fly logs -a ethernal --no-tail 2>&1 | tail -100` — recent crash logs
- `fly machines list -a ethernal --json 2>&1 | python3 -c "import sys,json; [print(f'{m[\"id\"]} {m[\"config\"][\"metadata\"][\"fly_process_group\"]} {m[\"state\"]}') for m in json.loads(sys.stdin.read())]"` — machine states
- `fly releases -a ethernal --json 2>&1 | python3 -c "import sys,json; rs=json.loads(sys.stdin.read())[:3]; [print(f'v{r[\"Version\"]} {r[\"ImageRef\"]} {r[\"CreatedAt\"]}') for r in rs]"` — last 3 releases
- `redis-cli -u $REDIS_URL --no-auth-warning LLEN bull:blockSync:wait` — waiting jobs
- `redis-cli -u $REDIS_URL --no-auth-warning LLEN bull:blockSync:active` — active jobs

## Step 2: Analyze

Look for patterns:
- **uncaughtException at startup** (missing module, syntax error) = code/build issue, ROLLBACK
- **OOM / memory errors** = resource issue, DON'T ROLLBACK
- **Redis/Postgres connection errors** = infra issue, DON'T ROLLBACK
- **Individual job failures** (not startup crash) = job-level bug, DON'T ROLLBACK

## Step 3: Cross-reference with release

If the latest release is different from the previous one, check what changed:
- `gh api repos/tryethernal/ethernal/releases --jq '.[0:2] | .[] | .tag_name'`
- If the crash started after a deploy, rollback is likely the fix.

## Step 4: Output your decision

At the END of your response, output exactly one of these lines:

If rollback needed:
```
ROLLBACK:yes
ROLLBACK_VERSION:<previous-version-number>
ROOT_CAUSE:<one-line summary>
```

If rollback NOT needed:
```
ROLLBACK:no
ROOT_CAUSE:<one-line summary>
RECOMMENDED_ACTION:<what should be done>
```
````

**Step 2: Commit**

```bash
git add scripts/watchdog-diagnose.md
git commit -m "feat: add Claude CLI diagnosis prompt for watchdog"
```

---

### Task 4: Create Watchdog Setup Script

**Files:**
- Create: `scripts/watchdog-setup.sh`

**Step 1: Write the setup script**

Create `scripts/watchdog-setup.sh`:

```bash
#!/usr/bin/env bash
# Sets up the ethernal-watchdog systemd timer on Hetzner.
# Run once: ssh root@157.90.154.200 < scripts/watchdog-setup.sh
set -euo pipefail

echo "=== Ethernal Watchdog Setup ==="

# Install Fly CLI if missing
if ! command -v flyctl &>/dev/null; then
    echo "Installing Fly CLI..."
    curl -L https://fly.io/install.sh | sh
    ln -sf /root/.fly/bin/flyctl /usr/local/bin/flyctl
    ln -sf /root/.fly/bin/flyctl /usr/local/bin/fly
    echo "Fly CLI installed. Run 'flyctl auth login' to authenticate."
fi

# Install redis-cli if missing
if ! command -v redis-cli &>/dev/null; then
    echo "Installing redis-tools..."
    apt-get update -qq && apt-get install -y -qq redis-tools
fi

# Create log directory
mkdir -p /var/log/ethernal-watchdog
chown blog:blog /var/log/ethernal-watchdog

# Create env file template (fill in manually)
if [ ! -f /home/blog/.watchdog.env ]; then
    cat > /home/blog/.watchdog.env << 'ENVEOF'
# Fill these in:
REDIS_URL=
OPSGENIE_API_KEY=
FLY_API_TOKEN=
GH_TOKEN=
ENVEOF
    chown blog:blog /home/blog/.watchdog.env
    chmod 600 /home/blog/.watchdog.env
    echo "Created /home/blog/.watchdog.env — fill in credentials!"
fi

# Create systemd service
cat > /etc/systemd/system/ethernal-watchdog.service << 'EOF'
[Unit]
Description=Ethernal Worker Watchdog
After=network-online.target
Wants=network-online.target

[Service]
Type=oneshot
User=blog
EnvironmentFile=/home/blog/.watchdog.env
ExecStart=/opt/ethernal/scripts/watchdog.sh
TimeoutStartSec=300
StandardOutput=journal
StandardError=journal
EOF

# Create systemd timer
cat > /etc/systemd/system/ethernal-watchdog.timer << 'EOF'
[Unit]
Description=Run Ethernal Worker Watchdog every 90s

[Timer]
OnBootSec=120
OnUnitActiveSec=90
AccuracySec=5

[Install]
WantedBy=timers.target
EOF

systemctl daemon-reload
systemctl enable ethernal-watchdog.timer
systemctl start ethernal-watchdog.timer

echo ""
echo "=== Setup complete ==="
echo "Timer status: $(systemctl is-active ethernal-watchdog.timer)"
echo ""
echo "Next steps:"
echo "  1. Fill in /home/blog/.watchdog.env with credentials"
echo "  2. Copy scripts to /opt/ethernal/scripts/"
echo "  3. Authenticate Fly CLI: flyctl auth login"
echo "  4. Test: systemctl start ethernal-watchdog.service && journalctl -u ethernal-watchdog -f"
```

**Step 2: Commit**

```bash
chmod +x scripts/watchdog-setup.sh
git add scripts/watchdog-setup.sh
git commit -m "feat: add watchdog setup script for Hetzner deployment"
```

---

### Task 5: Expand sentry-auto-fix.yml for worker-crash Label

**Files:**
- Modify: `.github/workflows/sentry-auto-fix.yml:29-37` (if condition)

**Step 1: Update the trigger condition**

In `.github/workflows/sentry-auto-fix.yml`, change the `if` block (lines 29-37) from:

```yaml
    if: >
      (
        (github.event_name == 'issues' &&
         github.event.action == 'labeled' &&
         contains(github.event.issue.labels.*.name, 'sentry') &&
         !contains(github.event.issue.labels.*.name, 'needs-human'))
        ||
        github.event_name == 'workflow_dispatch'
      )
```

to:

```yaml
    if: >
      (
        (github.event_name == 'issues' &&
         github.event.action == 'labeled' &&
         (contains(github.event.issue.labels.*.name, 'sentry') ||
          contains(github.event.issue.labels.*.name, 'worker-crash')) &&
         !contains(github.event.issue.labels.*.name, 'needs-human'))
        ||
        github.event_name == 'workflow_dispatch'
      )
```

**Step 2: Add actor guard step**

After the "Get issue info" step (after line 57), add a new step:

```yaml
      - name: Verify worker-crash trigger source
        if: contains(github.event.issue.labels.*.name, 'worker-crash')
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        run: |
          if [ "${{ github.actor }}" != "github-actions[bot]" ]; then
            gh issue comment ${{ steps.issue_info.outputs.number }} \
              --repo ${{ github.repository }} \
              --body "Skipped: worker-crash auto-fix can only be triggered by the automated watchdog (github-actions[bot])."
            echo "::error::Unauthorized actor ${{ github.actor }} added worker-crash label"
            exit 1
          fi
```

**Step 3: Commit**

```bash
git add .github/workflows/sentry-auto-fix.yml
git commit -m "feat: expand auto-fix workflow to handle worker-crash label"
```

---

### Task 6: Deploy Worker Heartbeats to Production

**Step 1: Push to develop and deploy**

```bash
git push origin develop
```

Then deploy using the standard deploy flow (version bump + deploy) or directly:

```bash
# Build and push image
flyctl auth docker
DOCKER_BUILDKIT=1 docker buildx build --platform linux/amd64 -f Dockerfile.backend.fly -t registry.fly.io/ethernal:5.17.65 --push .

# Deploy
fly deploy -a ethernal -i registry.fly.io/ethernal:5.17.65 --strategy rolling
```

**Step 2: Verify heartbeats are working in production**

```bash
fly ssh console -a ethernal -C "node -e \"
const redis = require('./lib/redis');
redis.keys('ethernal:worker:*:heartbeat:*').then(keys => {
  console.log('Heartbeat keys:', keys.length);
  keys.forEach(k => redis.get(k).then(v => console.log(k, v)));
  setTimeout(() => process.exit(0), 2000);
});
\""
```

Expected: 11 heartbeat keys (3 hworker + 2 mworker + 2 lpworker + 2 phworker + 2 more).

**Step 3: Commit deploy version bump if needed**

---

### Task 7: Deploy Watchdog to Hetzner

**Step 1: Copy scripts to server**

```bash
scp scripts/watchdog.sh scripts/watchdog-diagnose.md scripts/watchdog-setup.sh root@157.90.154.200:/tmp/
ssh root@157.90.154.200 "mkdir -p /opt/ethernal/scripts && mv /tmp/watchdog*.sh /tmp/watchdog-diagnose.md /opt/ethernal/scripts/ && chmod +x /opt/ethernal/scripts/watchdog*.sh"
```

**Step 2: Run setup script**

```bash
ssh root@157.90.154.200 "bash /opt/ethernal/scripts/watchdog-setup.sh"
```

**Step 3: Fill in credentials**

```bash
ssh root@157.90.154.200 "cat > /home/blog/.watchdog.env << 'EOF'
REDIS_URL=redis://default:TismjYcWA0vNmR2ds1N2DVaak1daZkrP@redisprod.tryethernal.com:6379
OPSGENIE_API_KEY=0043896f-4869-403e-94b1-55ea016a540c
FLY_API_TOKEN=<get from: flyctl auth token>
GH_TOKEN=<same PAT as blog pipeline>
EOF
chmod 600 /home/blog/.watchdog.env
chown blog:blog /home/blog/.watchdog.env"
```

**NOTE:** Get `FLY_API_TOKEN` by running `flyctl auth token` locally. Get `GH_TOKEN` from `/home/blog/.blog-pipeline.env` on the server.

**Step 4: Authenticate Fly CLI on server**

```bash
ssh root@157.90.154.200 "FLY_API_TOKEN=<token> flyctl auth token"
```

**Step 5: Test the watchdog manually**

```bash
ssh root@157.90.154.200 "systemctl start ethernal-watchdog.service && journalctl -u ethernal-watchdog -f --no-pager -n 50"
```

Expected: All checks pass, "OK: All checks passed".

**Step 6: Verify timer is running**

```bash
ssh root@157.90.154.200 "systemctl status ethernal-watchdog.timer"
```

---

### Task 8: End-to-End Test (Simulated Failure)

**Step 1: Temporarily stop a heartbeat write**

```bash
# Delete one heartbeat key to simulate stale worker
fly ssh console -a ethernal -C "node -e \"
const redis = require('./lib/redis');
redis.keys('ethernal:worker:highPriority:heartbeat:*').then(keys => {
  if (keys[0]) redis.del(keys[0]).then(() => console.log('Deleted:', keys[0]));
  setTimeout(() => process.exit(0), 1000);
});
\""
```

**Step 2: Watch watchdog detect it**

```bash
ssh root@157.90.154.200 "journalctl -u ethernal-watchdog -f --no-pager"
```

Expected: "FAIL: All heartbeats stale for highPriority" on first run. Second run should also fail. But since the heartbeat will be re-written within 30s by the actual worker, the first check may pass. This validates the monitoring path without triggering diagnosis.

**Step 3: Verify heartbeat recovers automatically**

The worker's 30s interval will re-write the key. Check after 30s:

```bash
fly ssh console -a ethernal -C "node -e \"
const redis = require('./lib/redis');
redis.keys('ethernal:worker:highPriority:heartbeat:*').then(keys => {
  console.log('Keys:', keys);
  setTimeout(() => process.exit(0), 1000);
});
\""
```

---

### Task 9: Create PR and Update Docs

**Step 1: Create PR**

```bash
git push origin develop
# If on a feature branch instead:
# gh pr create --title "feat: external watchdog + AI auto-remediation for worker crashes" --body "..."
```

**Step 2: Update CLAUDE.md quick reference table**

Add a row to the quick reference table:
```
| Worker watchdog | `scripts/watchdog.sh`, `scripts/watchdog-diagnose.md`, `run/lib/heartbeat.js` | |
```

**Step 3: Update memory**

Update `~/.claude/projects/-Users-antoine-ethernal-ethernal/memory/infra-monitoring.md` with:
- Watchdog timer details
- Heartbeat key patterns
- How to test/disable the watchdog

**Step 4: Commit docs**

```bash
git add CLAUDE.md
git commit -m "docs: add watchdog references to CLAUDE.md"
```

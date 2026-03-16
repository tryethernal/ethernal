# Worker Crash Alerting & AI Auto-Remediation

**Date:** 2026-03-16
**Status:** Approved
**Trigger:** All workers crash-looped in production because `Dockerfile.backend.fly` didn't copy `run/emails/` into the Docker image. Existing monitoring (`queueMonitoring`, `infraHealthCheck`) runs as BullMQ jobs inside the same workers, so it was killed by the same problem.

## Problem

Internal monitoring is inside the blast radius. When all workers crash at startup (e.g. missing module), the monitoring jobs can't run either. No alert fires. Queues pile up silently until a human notices.

## Solution: External Watchdog + AI Incident Pipeline

### Architecture

```
[Every 90s] Hetzner Watchdog (systemd timer)
    |
    +-- Check API health (curl /api/status/health)
    +-- Check worker heartbeats (Redis keys, stale > 1 min)
    +-- Check queue drain (waiting > 0, active == 0 for 30s+)
            |
            | 2 consecutive failures
            v
    Claude CLI Diagnosis (Hetzner, ~30-60s)
    |
    +-- Gather: fly logs, machine status, releases, queue state
    +-- Cross-reference: git log between versions
    +-- Decide: rollback vs infra issue vs job-level failure
    |
    +--[If rollback needed]--> fly deploy -i <previous-image>
    |                          Verify recovery (2 min)
    |
    +-- Alert: OpsGenie P1 with full diagnosis
    |
    +-- Create GitHub Issue (label: worker-crash)
        |   Contains: crash logs, diagnosis, root cause
        |
        v
    GitHub Actions (sentry-auto-fix.yml, expanded trigger)
    |
    +-- claude-code-action: fix root cause on develop
    +-- Create PR targeting develop
    +-- Link PR to issue
    +-- Post PR link to OpsGenie
```

### Component 1: Worker Heartbeats

Each worker process writes a heartbeat to Redis every 30 seconds on startup and via `setInterval`:

- Key: `ethernal:worker:{type}:heartbeat` (e.g. `ethernal:worker:highPriority:heartbeat`)
- Value: JSON `{ timestamp, pid, machineId }`
- TTL: 120 seconds (auto-expires if worker dies)

Files changed: `run/workers/highPriority.js`, `run/workers/mediumPriority.js`, `run/workers/lowPriority.js` (~10 lines each).

### Component 2: External Watchdog (Hetzner)

**Script:** `scripts/watchdog.sh`
**Runs on:** Hetzner sentry server (157.90.154.200)
**Schedule:** systemd timer, every 90 seconds
**Auth:** Fly CLI token, Claude CLI (already configured for blog pipeline), `gh` CLI

**Health checks:**
1. API: `curl -sf https://app.tryethernal.com/api/status/health` (timeout 10s)
2. Worker heartbeats: read Redis keys `ethernal:worker:*:heartbeat`, flag if any type has no heartbeat or timestamp > 60s ago
3. Queue drain: query blockSync queue. If waiting > 0 AND active == 0 for 30s+, flag.

**Detection logic:**
- 2 consecutive failures (3 min window) before triggering diagnosis
- State file `/tmp/ethernal-watchdog-state.json` tracks consecutive failures

**On failure detection:**
- Run `claude -p` with diagnosis prompt (`scripts/watchdog-diagnose.md`)
- Claude gathers evidence, decides rollback vs alert-only
- If rollback: `fly deploy -a ethernal -i registry.fly.io/ethernal:{previous_version} --strategy rolling`
- Create OpsGenie P1 alert
- Create GitHub issue with `worker-crash` label

**Safety rails:**
- Max 1 rollback per hour (state file tracks last rollback time)
- Never rollback more than 1 version back
- If rollback doesn't restore heartbeats within 3 min, escalate with "manual intervention required"

### Component 3: Auto-Fix Workflow (GitHub Actions)

**Reuse existing:** Expand `sentry-auto-fix.yml` trigger condition to also fire on the `worker-crash` label.

**Trigger guard:** For `worker-crash` labeled issues, verify `github.actor == 'github-actions[bot]'`. If a human adds the label, skip with a comment.

**Change in `sentry-auto-fix.yml`:**
```yaml
# Existing condition adds worker-crash:
contains(github.event.issue.labels.*.name, 'sentry') ||
contains(github.event.issue.labels.*.name, 'worker-crash')
```

The Claude Code prompt already reads the issue body for context, so the watchdog's diagnosis naturally informs the fix.

### New Files

| File | Purpose |
|------|---------|
| `scripts/watchdog.sh` | Health check + trigger logic |
| `scripts/watchdog-diagnose.md` | Claude CLI prompt for AI diagnosis |
| `scripts/watchdog-setup.sh` | Installs systemd timer on Hetzner |

### Modified Files

| File | Change |
|------|--------|
| `run/workers/highPriority.js` | Add heartbeat writes |
| `run/workers/mediumPriority.js` | Add heartbeat writes |
| `run/workers/lowPriority.js` | Add heartbeat writes |
| `.github/workflows/sentry-auto-fix.yml` | Add `worker-crash` label trigger + actor guard |

### Thresholds

| Check | Threshold | Rationale |
|-------|-----------|-----------|
| Heartbeat stale | > 60s | Workers write every 30s, TTL 120s. 60s gives 1 missed beat. |
| Queue drain | waiting > 0, active == 0 for 30s | If no worker picks up jobs in 30s, something is wrong. |
| Consecutive failures | 2 | Avoids false positives during rolling deploys. |
| Rollback cooldown | 1 per hour | Prevents rollback loops. |
| Diagnosis timeout | 60s | Claude CLI budget for evidence gathering. |

### Dependencies

- Fly CLI on Hetzner (install: `curl -L https://fly.io/install.sh | sh`)
- Claude CLI on Hetzner (already installed for blog pipeline)
- `gh` CLI on Hetzner (install: `apt install gh`)
- GitHub PAT with issues:write scope (for creating issues as github-actions[bot])

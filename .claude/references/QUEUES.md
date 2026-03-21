# Job Queue System

## Queue Priorities

| Priority | Queue | Worker | Use Case |
|----------|-------|--------|----------|
| High | `high` | `highPriority.js` | Real-time sync: blockSync, receiptSync, deposits |
| Medium | `medium` | `mediumPriority.js` | Indexing: processContract, processTokenTransfer, L2 finalization |
| Low | `low` | `lowPriority.js` | Analytics, cleanup, non-urgent tasks |
| Special | `processHistoricalBlocks` | `processHistoricalBlocks.js` | Dedicated queue for historical sync |

High and medium run as separate processes for event loop isolation. `highMediumPriority.js` still exists as a combined entry point for backward compatibility. Medium tier has extended `lockDuration` (300s) and `maxStalledCount` (5) for longer-running indexing jobs.

**Redis/BullMQ gotcha:** Legacy `bull:*:priority` sorted sets (from BullMQ v4) accumulate orphaned entries that are never cleaned up. BullMQ v5 uses `prioritized` instead. The `queueMonitoring` job periodically cleans these legacy keys to prevent Redis OOM. If Redis hits `maxmemory` with `noeviction` policy, all queue processing stops because BullMQ can't write.

## Enqueue Pattern

```javascript
const { enqueue, bulkEnqueue } = require('../lib/queue');

// Single job
await enqueue(
    'jobName',           // Queue/job name
    `jobName-${id}`,     // Job ID (for deduplication)
    { data },            // Job data
    'high',              // Priority
    null,                // Repeat config
    1000,                // Delay in ms
    true                 // unique: prevents duplicates
);

// Bulk enqueue (batches of 2000)
await bulkEnqueue('jobName', [
    { name: 'job-1', data: { ... } },
    { name: 'job-2', data: { ... } }
], 'medium');
```

## Common Job Chains

```
Block Sync Flow:
blockSync → receiptSync → processContract → processTokenTransfer → balanceChanges
blockSync → processOpBatch (OP batch detection, decoupled from sync path)

L2 Event Flow:
PM2 logListener → storeOrbitDeposit / checkOrbitMessageDeliveredLogs
PM2 opLogListener → storeOpDeposit / checkOpDepositLogs
```

## Job Callers — Check ALL of Them

Jobs are enqueued from multiple places — the main backend, the cli-light repo, and the PM2 server. **When changing a job's expected parameters, you MUST check all callers across all repos:**

| Repo | Location | Jobs enqueued |
|------|----------|---------------|
| `ethernal` (main) | `run/api/`, `run/jobs/`, `run/models/` | blockSync, batchBlockSync, receiptSync, etc. |
| `ethernal-cli-light` | `src/index.ts` | blockSync (via direct Redis/BullMQ) |
| `ethernal` PM2 server | `pm2-server/*.js` | storeOrbitDeposit, storeOpDeposit |

**cli-light enqueues directly to Redis** (not via the backend API), so changes to job parameter requirements will silently break it if not updated in lockstep. The cli-light npm package is installed in `Dockerfile.pm2` and deployed to the `ethernal-pm2` Fly app.

## Job Error Handling

**Throw on invalid params, never return a string.** BullMQ marks jobs that return a string as *completed* (not failed), hiding errors from Sentry and queue monitoring. Invalid parameters should always `throw new Error(...)` so the job appears as failed.

```javascript
// WRONG — job silently completes, error is invisible
if (!data.workspaceId)
    return 'Missing workspaceId';

// RIGHT — job fails, shows up in Sentry and BullMQ failed queue
if (!data.workspaceId)
    throw new Error('Missing workspaceId');
```

**Note:** BullMQ has 0 retries configured by default in this project, so thrown errors won't cause retry loops.

## Job Naming Convention

```
${jobType}-${workspaceId}-${identifier}-${timestamp}

Examples:
- blockSync-123-1000-1703123456789
- processContract-123-0xabc123...
```

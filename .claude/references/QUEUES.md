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

## Job Naming Convention

```
${jobType}-${workspaceId}-${identifier}-${timestamp}

Examples:
- blockSync-123-1000-1703123456789
- processContract-123-0xabc123...
```

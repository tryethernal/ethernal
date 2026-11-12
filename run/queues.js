const { Queue } = require('bullmq');
const connection = require('./lib/redis');
const priorities = require('./workers/priorities');

const queues = {};

const highDefaultJobOptions = {
    attempts: 15,
    stackTraceLimit: 3,
    removeOnComplete: {
        count: 100,
        age: 4 * 60
    },
    removeOnFail: {
        count: 50,
        age: 4 * 60
    },
    timeout: 30000,
    backoff: {
        type: 'fixed',
        delay: 30000
    },
};

// updateExplorerSyncingProcess jobs are enqueued with a fixed jobId per explorer
// (updateExplorerSyncingProcess-<explorerId>). BullMQ ignores `add` for an existing
// jobId in any state, including completed/failed, and only trims finished jobs when
// another job of the queue finishes. Remove them immediately so a finished job never
// blocks the next request; in-flight (waiting/delayed/active) dedup is unaffected.
const overrideJobOptions = {
    updateExplorerSyncingProcess: {
        removeOnComplete: true,
        removeOnFail: true
    }
};

priorities['high'].forEach(jobName => {
    queues[jobName] = new Queue(jobName, {
        defaultJobOptions: Object.assign({}, highDefaultJobOptions, overrideJobOptions[jobName]),
        stalledInterval: 29000,
        maxStalledCount: 5,
        connection,
    });
});

priorities['medium'].forEach(jobName => {
    queues[jobName] = new Queue(jobName, {
        defaultJobOptions: {
            attempts: 40,
            stackTraceLimit: 3,
            removeOnComplete: 20,
            removeOnFail: 20,
            timeout: 30000,
            backoff: {
                type: 'exponential',
                delay: 1000
            }
        },
        connection
    });
});

priorities['low'].forEach(jobName => {
    // workspaceReset is registered separately below without the shared 30s
    // timeout; skip it here so we don't create an orphaned Queue instance.
    if (jobName === 'workspaceReset')
        return;

    queues[jobName] = new Queue(jobName, {
        defaultJobOptions: {
            attempts: 10,
            stackTraceLimit: 3,
            removeOnComplete: 10,
            removeOnFail: 10,
            timeout: 30000,
            backoff: {
                type: 'exponential',
                delay: 1000
            }
        },
        connection
    });
});

// workspaceReset paginates through a workspace's blocks/contracts (millions of
// rows for large free/demo explorers) to enqueue batchBlockDelete jobs. The
// shared low-tier 30s timeout stalled it before it enumerated anything, so
// large workspaces never got pruned. Register it without a per-job timeout;
// the bounded, indexed keyset queries are the only work it does (the actual
// deletes happen in batchBlockDelete).
queues['workspaceReset'] = new Queue('workspaceReset', {
    defaultJobOptions: {
        attempts: 10,
        stackTraceLimit: 3,
        removeOnComplete: 10,
        removeOnFail: 10,
        backoff: {
            type: 'exponential',
            delay: 1000
        }
    },
    connection
});

queues['processHistoricalBlocks'] = new Queue('processHistoricalBlocks', {
    defaultJobOptions: {
        attempts: 5,
        stackTraceLimit: 3,
        removeOnComplete: {
            count: 100,
            age: 4 * 60
        },
        removeOnFail: {
            count: 10,
            age: 4 * 60
        },
        timeout: 30000,
        backoff: {
            type: 'fixed',
            delay: 30000
        },
    },
    stalledInterval: 29000,
    maxStalledCount: 5,
    connection,
});

module.exports = queues;

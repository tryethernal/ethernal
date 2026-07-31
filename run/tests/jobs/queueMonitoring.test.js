require('../mocks/lib/queue');
require('../mocks/lib/logger');
require('../mocks/lib/opsgenie');

const { createIncident, closeIncident } = require('../../lib/opsgenie');
const logger = require('../../lib/logger');
const redis = require('../../lib/redis');

let mockGetCompleted, mockGetWaitingCount, mockGetPrioritizedCount, mockGetDelayedCount, mockGetFailedCount, mockGetFailed;

jest.mock('bullmq', () => ({
    Queue: jest.fn().mockImplementation(() => ({
        getCompleted: (...args) => mockGetCompleted(...args),
        getWaitingCount: (...args) => mockGetWaitingCount(...args),
        getPrioritizedCount: (...args) => mockGetPrioritizedCount(...args),
        getDelayedCount: (...args) => mockGetDelayedCount(...args),
        getFailedCount: (...args) => mockGetFailedCount(...args),
        getFailed: (...args) => mockGetFailed(...args),
        getJob: jest.fn().mockResolvedValue(null),
    }))
}));

// Stateful counter store so consecutive-breach tracking behaves like real Redis.
const breachCounters = new Map();

jest.mock('../../lib/redis', () => ({
    zcard: jest.fn().mockResolvedValue(0),
    unlink: jest.fn().mockResolvedValue(1),
    zrevrange: jest.fn().mockResolvedValue([]),
    get: jest.fn().mockResolvedValue(null), // Mock for legacy cleanup cache
    set: jest.fn().mockResolvedValue('OK'), // Mock for legacy cleanup cache
    incr: jest.fn(),
    expire: jest.fn().mockResolvedValue(1),
    del: jest.fn(),
    pipeline: jest.fn().mockReturnValue({
        zcard: jest.fn().mockReturnThis(),
        unlink: jest.fn().mockReturnThis(),
        zrevrange: jest.fn().mockReturnThis(),
        llen: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([
            [null, 0],  // Mock result for zcard (legacy key count)
            [null, 0],  // Mock result for zcard (legacy key count)
            [null, 0]   // Mock result for zcard (legacy key count)
        ])
    })
}));

/** Number of consecutive breached samples required before the pager fires. */
const BREACHES_BEFORE_ALERT = 3;

/**
 * Runs the monitoring job enough times to satisfy the consecutive-breach gate.
 * @param {number} [times=BREACHES_BEFORE_ALERT]
 * @returns {Promise<boolean>} The result of the final run
 */
const runUntilAlert = async (times = BREACHES_BEFORE_ALERT) => {
    let result;
    for (let i = 0; i < times; i++)
        result = await queueMonitoring();
    return result;
};

const queueMonitoring = require('../../jobs/queueMonitoring');

beforeEach(() => {
    createIncident.mockClear();
    closeIncident.mockClear();
    logger.info.mockClear();
    logger.error.mockClear();
    redis.get.mockClear().mockResolvedValue(null);
    redis.set.mockClear().mockResolvedValue('OK');
    breachCounters.clear();
    redis.incr.mockClear().mockImplementation(async key => {
        const next = (breachCounters.get(key) || 0) + 1;
        breachCounters.set(key, next);
        return next;
    });
    redis.expire.mockClear().mockResolvedValue(1);
    redis.del.mockClear().mockImplementation(async key => {
        breachCounters.delete(key);
        return 1;
    });
    redis.pipeline.mockClear().mockReturnValue({
        zcard: jest.fn().mockReturnThis(),
        unlink: jest.fn().mockReturnThis(),
        zrevrange: jest.fn().mockReturnThis(),
        llen: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([
            [null, 0],
            [null, 0],
            [null, 0]
        ])
    });
    mockGetCompleted = jest.fn().mockResolvedValue([]);
    mockGetWaitingCount = jest.fn().mockResolvedValue(0);
    mockGetPrioritizedCount = jest.fn().mockResolvedValue(0);
    mockGetDelayedCount = jest.fn().mockResolvedValue(0);
    mockGetFailedCount = jest.fn().mockResolvedValue(0);
    mockGetFailed = jest.fn().mockResolvedValue([]);
});

describe('queueMonitoring', () => {
    it('Should create an activity incident with dedup alias when no jobs are enqueued', async () => {
        mockGetCompleted.mockResolvedValue([{
            timestamp: Date.now() - 120 * 1000
        }]);

        const result = await queueMonitoring();

        expect(createIncident).toHaveBeenCalledWith(
            'blockSync queue issue (no jobs enqueued)',
            expect.any(String),
            'P1',
            { alias: 'queue-activity-blockSync' }
        );
        expect(result).toBe(true);
    });

    it('Should not create an activity incident if jobs are recent', async () => {
        mockGetCompleted.mockResolvedValue([{
            timestamp: Date.now() - 10 * 1000
        }]);

        await queueMonitoring();

        expect(createIncident).not.toHaveBeenCalled();
    });

    it('Should close the activity alert when a recent job is enqueued', async () => {
        mockGetCompleted.mockResolvedValue([{
            timestamp: Date.now() - 10 * 1000
        }]);

        await queueMonitoring();

        expect(closeIncident).toHaveBeenCalledWith(
            'queue-activity-blockSync',
            expect.objectContaining({ note: expect.any(String) })
        );
    });

    it('Should not close the activity alert when no completed jobs are retained (queue could still be stalled)', async () => {
        mockGetCompleted.mockResolvedValue([]);

        await queueMonitoring();

        expect(closeIncident).not.toHaveBeenCalledWith(
            'queue-activity-blockSync',
            expect.anything()
        );
    });

    it('Should create a performance incident with dedup alias when p95 exceeds max', async () => {
        const now = Date.now();
        mockGetCompleted.mockResolvedValue([
            { processedOn: now - 70000, finishedOn: now },
            { processedOn: now - 5000, finishedOn: now },
            { processedOn: now - 3000, finishedOn: now },
        ]);
        mockGetWaitingCount.mockResolvedValue(0);
        mockGetDelayedCount.mockResolvedValue(0);
        mockGetFailedCount.mockResolvedValue(0);

        const result = await runUntilAlert();

        expect(createIncident).toHaveBeenCalledWith(
            expect.stringContaining('queue issue (performance)'),
            expect.stringContaining('P95 processing time'),
            'P1',
            expect.objectContaining({ alias: expect.stringContaining('queue-performance-') })
        );
        expect(result).toBe(true);
    });

    it('Should create a performance incident when the backlog stays above max', async () => {
        mockGetCompleted.mockResolvedValue([]);
        mockGetWaitingCount.mockResolvedValue(9000);
        mockGetDelayedCount.mockResolvedValue(0);
        mockGetFailedCount.mockResolvedValue(0);

        const result = await runUntilAlert();

        expect(createIncident).toHaveBeenCalledWith(
            expect.stringContaining('queue issue (performance)'),
            expect.any(String),
            'P1',
            expect.objectContaining({ alias: expect.stringContaining('queue-performance-') })
        );
        expect(result).toBe(true);
    });

    it('Should not page on a transient backlog burst that drains', async () => {
        mockGetCompleted.mockResolvedValue([]);
        mockGetDelayedCount.mockResolvedValue(0);
        mockGetFailedCount.mockResolvedValue(0);

        // Two breached samples, then the burst drains before the third check.
        mockGetWaitingCount.mockResolvedValue(12000);
        await queueMonitoring();
        await queueMonitoring();

        expect(createIncident).not.toHaveBeenCalled();

        mockGetWaitingCount.mockResolvedValue(0);
        await queueMonitoring();

        expect(createIncident).not.toHaveBeenCalled();
        expect(closeIncident).toHaveBeenCalledWith(
            'queue-performance-blockSync',
            expect.objectContaining({ note: expect.stringContaining('Performance recovered') })
        );
    });

    it('Should restart the breach count after the backlog recovers', async () => {
        mockGetCompleted.mockResolvedValue([]);
        mockGetDelayedCount.mockResolvedValue(0);
        mockGetFailedCount.mockResolvedValue(0);

        mockGetWaitingCount.mockResolvedValue(12000);
        await queueMonitoring();
        await queueMonitoring();

        mockGetWaitingCount.mockResolvedValue(0);
        await queueMonitoring();

        // A fresh burst must serve the full consecutive-breach sentence again.
        mockGetWaitingCount.mockResolvedValue(12000);
        await queueMonitoring();
        await queueMonitoring();

        expect(createIncident).not.toHaveBeenCalled();

        await queueMonitoring();

        expect(createIncident).toHaveBeenCalledWith(
            expect.stringContaining('queue issue (performance)'),
            expect.any(String),
            'P1',
            expect.objectContaining({ alias: 'queue-performance-blockSync' })
        );
    });

    it('Should page on prioritized jobs when queue depth exceeds threshold', async () => {
        mockGetCompleted.mockResolvedValue([]);
        mockGetWaitingCount.mockResolvedValue(0);
        mockGetPrioritizedCount.mockResolvedValue(300); // Exceeds prioritized threshold of 200
        mockGetDelayedCount.mockResolvedValue(0);
        mockGetFailedCount.mockResolvedValue(0);

        await runUntilAlert(3);

        expect(createIncident).toHaveBeenCalledWith(
            'blockSync queue issue (performance)',
            expect.stringContaining('Waiting: 0'),
            'P1',
            expect.any(Object)
        );
    });

    it('Should not page on small prioritized backlogs', async () => {
        mockGetCompleted.mockResolvedValue([]);
        mockGetWaitingCount.mockResolvedValue(0);
        mockGetPrioritizedCount.mockResolvedValue(50); // Below prioritized threshold of 200
        mockGetDelayedCount.mockResolvedValue(0);
        mockGetFailedCount.mockResolvedValue(0);

        await runUntilAlert(5);

        expect(createIncident).not.toHaveBeenCalled();
    });

    it('Should not page when the backlog is within the per-workspace queue cap', async () => {
        mockGetCompleted.mockResolvedValue([]);
        // 200 is the blockSync per-workspace cap — legitimate, not an incident.
        mockGetWaitingCount.mockResolvedValue(200);
        mockGetDelayedCount.mockResolvedValue(0);
        mockGetFailedCount.mockResolvedValue(0);

        await runUntilAlert(5);

        expect(createIncident).not.toHaveBeenCalled();
    });

    it('Should create a performance incident when combined thresholds are exceeded', async () => {
        const now = Date.now();
        // p95 = 65s (above the 60s max) and backlog above the high threshold
        mockGetCompleted.mockResolvedValue([
            { processedOn: now - 65000, finishedOn: now },
        ]);
        mockGetWaitingCount.mockResolvedValue(600);
        mockGetDelayedCount.mockResolvedValue(0);
        mockGetFailedCount.mockResolvedValue(0);

        const result = await runUntilAlert();

        expect(createIncident).toHaveBeenCalledWith(
            expect.stringContaining('queue issue (performance)'),
            expect.any(String),
            'P1',
            expect.objectContaining({ alias: expect.stringContaining('queue-performance-') })
        );
        expect(result).toBe(true);
    });

    it('Should not create a performance incident when all metrics are healthy', async () => {
        const now = Date.now();
        mockGetCompleted.mockResolvedValue([
            { processedOn: now - 2000, finishedOn: now },
            { processedOn: now - 1000, finishedOn: now },
        ]);
        mockGetWaitingCount.mockResolvedValue(5);
        mockGetDelayedCount.mockResolvedValue(0);
        mockGetFailedCount.mockResolvedValue(0);

        await queueMonitoring();

        expect(createIncident).not.toHaveBeenCalled();
    });

    it('Should close performance and failure alerts when metrics are healthy', async () => {
        const now = Date.now();
        mockGetCompleted.mockResolvedValue([
            { processedOn: now - 2000, finishedOn: now },
        ]);
        mockGetWaitingCount.mockResolvedValue(5);
        mockGetDelayedCount.mockResolvedValue(0);
        mockGetFailedCount.mockResolvedValue(0);

        await queueMonitoring();

        expect(closeIncident).toHaveBeenCalledWith(
            'queue-performance-blockSync',
            expect.objectContaining({ note: expect.stringContaining('Performance recovered') })
        );
        expect(closeIncident).toHaveBeenCalledWith(
            'queue-performance-receiptSync',
            expect.objectContaining({ note: expect.stringContaining('Performance recovered') })
        );
        expect(closeIncident).toHaveBeenCalledWith(
            'queue-failures-blockSync',
            expect.objectContaining({ note: expect.stringContaining('Failures recovered') })
        );
        expect(closeIncident).toHaveBeenCalledWith(
            'queue-failures-receiptSync',
            expect.objectContaining({ note: expect.stringContaining('Failures recovered') })
        );
    });

    it('Should not close performance alert while threshold is still breached', async () => {
        mockGetCompleted.mockResolvedValue([]);
        mockGetWaitingCount.mockResolvedValue(9000);
        mockGetDelayedCount.mockResolvedValue(0);
        mockGetFailedCount.mockResolvedValue(0);

        await queueMonitoring();

        expect(closeIncident).not.toHaveBeenCalledWith(
            'queue-performance-blockSync',
            expect.anything()
        );
    });

    it('Should create a failure incident with P2 when 10+ jobs fail in 5 minutes', async () => {
        const now = Date.now();
        mockGetCompleted.mockResolvedValue([
            { processedOn: now - 1000, finishedOn: now },
        ]);
        mockGetWaitingCount.mockResolvedValue(0);
        mockGetDelayedCount.mockResolvedValue(0);
        mockGetFailedCount.mockResolvedValue(15);

        const recentFailures = Array.from({ length: 12 }, (_, i) => ({
            finishedOn: now - i * 1000
        }));
        mockGetFailed.mockResolvedValue(recentFailures);

        const result = await queueMonitoring();

        expect(createIncident).toHaveBeenCalledWith(
            expect.stringContaining('queue issue (failures)'),
            expect.stringContaining('12 failed jobs in the last 5 minutes'),
            'P2',
            expect.objectContaining({ alias: expect.stringContaining('queue-failures-') })
        );
        expect(result).toBe(true);
    });

    it('Should not create a failure incident when failures are old', async () => {
        const now = Date.now();
        mockGetCompleted.mockResolvedValue([
            { processedOn: now - 1000, finishedOn: now },
        ]);
        mockGetWaitingCount.mockResolvedValue(0);
        mockGetDelayedCount.mockResolvedValue(0);
        mockGetFailedCount.mockResolvedValue(15);

        const oldFailures = Array.from({ length: 15 }, (_, i) => ({
            finishedOn: now - 10 * 60 * 1000 - i * 1000
        }));
        mockGetFailed.mockResolvedValue(oldFailures);

        await queueMonitoring();

        expect(createIncident).not.toHaveBeenCalled();
    });

    it('Should log queue metrics including failed job count', async () => {
        const now = Date.now();
        mockGetCompleted.mockResolvedValue([
            { processedOn: now - 2000, finishedOn: now },
        ]);
        mockGetWaitingCount.mockResolvedValue(3);
        mockGetDelayedCount.mockResolvedValue(1);
        mockGetFailedCount.mockResolvedValue(2);

        await queueMonitoring();

        expect(logger.info).toHaveBeenCalledWith('Queue monitoring', expect.objectContaining({
            p95ProcessingTime: expect.any(Number),
            waitingJobCount: 3,
            prioritizedJobCount: 0,
            delayedJobCount: 1,
            failedJobCount: 2,
        }));
    });

    it('Should compute p95 correctly with multiple jobs', async () => {
        const now = Date.now();
        // 20 jobs with processing times 1s through 20s
        // p95 index = ceil(20 * 0.95) - 1 = 19, so p95 = 20s (the highest)
        const jobs = Array.from({ length: 20 }, (_, i) => ({
            processedOn: now - (i + 1) * 1000,
            finishedOn: now,
        }));
        mockGetCompleted.mockResolvedValue(jobs);
        mockGetWaitingCount.mockResolvedValue(0);
        mockGetDelayedCount.mockResolvedValue(0);
        mockGetFailedCount.mockResolvedValue(0);

        await queueMonitoring();

        // p95 of 1..20s = 20s, which is below the 60s max threshold
        // but at exactly the 20s high threshold with 0 waiting - no alert expected
        expect(createIncident).not.toHaveBeenCalled();
    });

    it('Should throttle legacy Redis cleanup when recently run', async () => {
        const now = Date.now();
        // Mock that cleanup ran recently (5 minutes ago, which is less than 15 minute interval)
        const recentTimestamp = (now - 5 * 60 * 1000).toString();
        redis.get.mockResolvedValueOnce(recentTimestamp);

        await queueMonitoring();

        // Should check cache timestamp but not run zcard pipeline operations
        expect(redis.get).toHaveBeenCalledWith('queue:legacy_cleanup_last_run');
        expect(redis.pipeline).not.toHaveBeenCalled(); // Cleanup should be skipped
    });

    it('Should run legacy Redis cleanup when enough time has passed', async () => {
        const now = Date.now();
        // Mock that cleanup ran long ago (20 minutes ago, which is more than 15 minute interval)
        const oldTimestamp = (now - 20 * 60 * 1000).toString();
        redis.get.mockResolvedValueOnce(oldTimestamp);

        await queueMonitoring();

        // Should check cache timestamp and run cleanup
        expect(redis.get).toHaveBeenCalledWith('queue:legacy_cleanup_last_run');
        expect(redis.pipeline).toHaveBeenCalled(); // Cleanup should run
        expect(redis.set).toHaveBeenCalledWith(
            'queue:legacy_cleanup_last_run',
            expect.any(String),
            'EX',
            expect.any(Number)
        );
    });
});

// Cap-sweep tests live in queueCapSweep.test.js (sweep moved out of queueMonitoring per #1319).

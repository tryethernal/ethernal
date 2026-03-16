require('../mocks/lib/queue');
require('../mocks/lib/logger');
require('../mocks/lib/opsgenie');

const { createIncident } = require('../../lib/opsgenie');
const logger = require('../../lib/logger');
const redis = require('../../lib/redis');

let mockGetCompleted, mockGetWaitingCount, mockGetDelayedCount, mockGetFailedCount, mockGetFailed;

jest.mock('bullmq', () => ({
    Queue: jest.fn().mockImplementation(() => ({
        getCompleted: (...args) => mockGetCompleted(...args),
        getWaitingCount: (...args) => mockGetWaitingCount(...args),
        getDelayedCount: (...args) => mockGetDelayedCount(...args),
        getFailedCount: (...args) => mockGetFailedCount(...args),
        getFailed: (...args) => mockGetFailed(...args),
        getJob: jest.fn().mockResolvedValue(null),
    }))
}));

jest.mock('../../lib/redis', () => ({
    zcard: jest.fn().mockResolvedValue(0),
    unlink: jest.fn().mockResolvedValue(1),
    zrevrange: jest.fn().mockResolvedValue([]),
    get: jest.fn().mockResolvedValue(null), // Mock for legacy cleanup cache
    set: jest.fn().mockResolvedValue('OK'), // Mock for legacy cleanup cache
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

const queueMonitoring = require('../../jobs/queueMonitoring');

beforeEach(() => {
    jest.clearAllMocks();
    mockGetCompleted = jest.fn().mockResolvedValue([]);
    mockGetWaitingCount = jest.fn().mockResolvedValue(0);
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

        const result = await queueMonitoring();

        expect(createIncident).toHaveBeenCalledWith(
            expect.stringContaining('queue issue (performance)'),
            expect.stringContaining('P95 processing time'),
            'P1',
            expect.objectContaining({ alias: expect.stringContaining('queue-performance-') })
        );
        expect(result).toBe(true);
    });

    it('Should create a performance incident when waiting job count exceeds max', async () => {
        mockGetCompleted.mockResolvedValue([]);
        mockGetWaitingCount.mockResolvedValue(150);
        mockGetDelayedCount.mockResolvedValue(0);
        mockGetFailedCount.mockResolvedValue(0);

        const result = await queueMonitoring();

        expect(createIncident).toHaveBeenCalledWith(
            expect.stringContaining('queue issue (performance)'),
            expect.any(String),
            'P1',
            expect.objectContaining({ alias: expect.stringContaining('queue-performance-') })
        );
        expect(result).toBe(true);
    });

    it('Should create a performance incident when combined thresholds are exceeded', async () => {
        const now = Date.now();
        // p95 = 25s (above 20s threshold), waiting = 60 (above 50 threshold)
        mockGetCompleted.mockResolvedValue([
            { processedOn: now - 25000, finishedOn: now },
        ]);
        mockGetWaitingCount.mockResolvedValue(60);
        mockGetDelayedCount.mockResolvedValue(0);
        mockGetFailedCount.mockResolvedValue(0);

        const result = await queueMonitoring();

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

jest.mock('../../lib/queue', () => ({
    ...jest.requireActual('../../lib/queue')
}));
require('../mocks/queues');

jest.mock('@sentry/node', () => ({
    startSpan: jest.fn((_, cb) => cb()),
    addBreadcrumb: jest.fn(),
}));

jest.mock('../../lib/queueCaps', () => ({
    getCap: jest.fn(),
    isLowTierWorkspace: jest.fn(),
    countWaitingForWorkspace: jest.fn(),
    shouldLogDrop: jest.fn(),
    // parseWorkspaceFromJobName is exported by queueCaps but not used by queue.js,
    // so we don't need it here. Avoid jest.requireActual on queueCaps because that
    // triggers a real models/index.js init which fails under NODE_ENV=test in CI
    // (no 'test' key in run/config/database.js).
    parseWorkspaceFromJobName: jest.fn(),
}));

jest.mock('../../lib/logger', () => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
}));

const { enqueue, bulkEnqueue } = require('../../lib/queue');
const queues = require('../../queues');
const queueCaps = require('../../lib/queueCaps');
const logger = require('../../lib/logger');

beforeEach(() => {
    queues['test'].addBulk.mockReset();
    queues['blockSync'] = { add: jest.fn(), addBulk: jest.fn() };
    queueCaps.getCap.mockReset().mockReturnValue(Infinity);
    queueCaps.isLowTierWorkspace.mockReset().mockResolvedValue(false);
    queueCaps.countWaitingForWorkspace.mockReset().mockResolvedValue(0);
    queueCaps.shouldLogDrop.mockReset().mockResolvedValue(true);
    logger.warn.mockReset();
});

describe('bulkEnqueue', () => {
    it('Enqueue 5 batches', async () => {
        const jobData = [];
        for (let i = 0; i < 10000; i++)
            jobData.push({ name: `job${i}`, data: { i }});
        await bulkEnqueue('test', jobData);
        expect(queues['test'].addBulk).toHaveBeenCalledTimes(5);
    });

    it('returns { attempted: N, accepted: N, dropped: 0 } when nothing is capped', async () => {
        queueCaps.getCap.mockReturnValue(Infinity);
        const jobs = [
            { name: 'a', data: { workspaceId: 1 } },
            { name: 'b', data: { workspaceId: 1 } },
        ];
        const result = await bulkEnqueue('test', jobs);
        expect(result).toEqual({ attempted: 2, accepted: 2, dropped: 0 });
    });

    it('returns { attempted: 0, accepted: 0, dropped: 0 } when jobData is empty', async () => {
        const result = await bulkEnqueue('test', []);
        expect(result).toEqual({ attempted: 0, accepted: 0, dropped: 0 });
    });

    it('returns { attempted: 0, accepted: 0, dropped: 0 } when jobData is null', async () => {
        const result = await bulkEnqueue('test', null);
        expect(result).toEqual({ attempted: 0, accepted: 0, dropped: 0 });
    });

    it('returns { attempted: 0, accepted: 0, dropped: 0 } when jobData is undefined', async () => {
        const result = await bulkEnqueue('test', undefined);
        expect(result).toEqual({ attempted: 0, accepted: 0, dropped: 0 });
    });

    it('returns { attempted: N, accepted: 0, dropped: N } when queueName is falsy', async () => {
        const jobs = [
            { name: 'a', data: { workspaceId: 1 } },
            { name: 'b', data: { workspaceId: 1 } },
        ];
        const result = await bulkEnqueue(null, jobs);
        expect(result).toEqual({ attempted: 2, accepted: 0, dropped: 2 });
    });

    it('returns result with dropped > 0 when low-tier workspace hits cap', async () => {
        queueCaps.getCap.mockReturnValue(200);
        queueCaps.isLowTierWorkspace.mockResolvedValue(true);
        queueCaps.countWaitingForWorkspace.mockResolvedValue(195);
        const jobs = [];
        for (let i = 0; i < 20; i++) jobs.push({ name: `j${i}`, data: { workspaceId: 1 } });
        const result = await bulkEnqueue('blockSync', jobs);
        expect(result).toEqual({ attempted: 20, accepted: 5, dropped: 15 });
    });

    it('returns { attempted: N, accepted: 0, dropped: N } when cap leaves zero room', async () => {
        queueCaps.getCap.mockReturnValue(200);
        queueCaps.isLowTierWorkspace.mockResolvedValue(true);
        queueCaps.countWaitingForWorkspace.mockResolvedValue(200);
        const jobs = [
            { name: 'a', data: { workspaceId: 1 } },
            { name: 'b', data: { workspaceId: 1 } },
            { name: 'c', data: { workspaceId: 1 } },
        ];
        const result = await bulkEnqueue('blockSync', jobs);
        expect(result).toEqual({ attempted: 3, accepted: 0, dropped: 3 });
    });

    it('proves enqueues still happen by asserting addBulk was called', async () => {
        queueCaps.getCap.mockReturnValue(Infinity);
        const jobs = [
            { name: 'a', data: { workspaceId: 1 } },
            { name: 'b', data: { workspaceId: 1 } },
        ];
        const result = await bulkEnqueue('blockSync', jobs);
        expect(result).toEqual({ attempted: 2, accepted: 2, dropped: 0 });
        expect(queues['blockSync'].addBulk).toHaveBeenCalledTimes(1);
    });
});

describe('enqueue cap enforcement', () => {
    it('skips cap check when queue is uncapped', async () => {
        queueCaps.getCap.mockReturnValue(Infinity);
        await enqueue('blockSync', 'blockSync-1-1', { workspaceId: 1, blockNumber: 1 });
        expect(queueCaps.isLowTierWorkspace).not.toHaveBeenCalled();
        expect(queues['blockSync'].add).toHaveBeenCalled();
    });

    it('skips cap check when data has no workspaceId', async () => {
        queueCaps.getCap.mockReturnValue(200);
        await enqueue('blockSync', 'blockSync-noid', { blockNumber: 1 });
        expect(queueCaps.isLowTierWorkspace).not.toHaveBeenCalled();
        expect(queues['blockSync'].add).toHaveBeenCalled();
    });

    it('skips cap check when workspace is not low-tier', async () => {
        queueCaps.getCap.mockReturnValue(200);
        queueCaps.isLowTierWorkspace.mockResolvedValue(false);
        await enqueue('blockSync', 'blockSync-1-1', { workspaceId: 1, blockNumber: 1 });
        expect(queueCaps.countWaitingForWorkspace).not.toHaveBeenCalled();
        expect(queues['blockSync'].add).toHaveBeenCalled();
    });

    it('enqueues low-tier job under cap', async () => {
        queueCaps.getCap.mockReturnValue(200);
        queueCaps.isLowTierWorkspace.mockResolvedValue(true);
        queueCaps.countWaitingForWorkspace.mockResolvedValue(199);
        const result = await enqueue('blockSync', 'blockSync-1-1', { workspaceId: 1, blockNumber: 1 });
        expect(queues['blockSync'].add).toHaveBeenCalled();
        expect(result).not.toBeNull();
    });

    it('drops low-tier job at cap and returns null', async () => {
        queueCaps.getCap.mockReturnValue(200);
        queueCaps.isLowTierWorkspace.mockResolvedValue(true);
        queueCaps.countWaitingForWorkspace.mockResolvedValue(200);
        const result = await enqueue('blockSync', 'blockSync-1-1', { workspaceId: 1, blockNumber: 1 });
        expect(queues['blockSync'].add).not.toHaveBeenCalled();
        expect(result).toBeNull();
    });

    it('logs drop when shouldLogDrop returns true', async () => {
        queueCaps.getCap.mockReturnValue(200);
        queueCaps.isLowTierWorkspace.mockResolvedValue(true);
        queueCaps.countWaitingForWorkspace.mockResolvedValue(200);
        queueCaps.shouldLogDrop.mockResolvedValue(true);
        await enqueue('blockSync', 'blockSync-1-1', { workspaceId: 1, blockNumber: 1 });
        expect(logger.warn).toHaveBeenCalledWith(
            expect.stringMatching(/cap reached/i),
            expect.objectContaining({ queueName: 'blockSync', workspaceId: 1, cap: 200 })
        );
    });

    it('does not log drop when shouldLogDrop returns false', async () => {
        queueCaps.getCap.mockReturnValue(200);
        queueCaps.isLowTierWorkspace.mockResolvedValue(true);
        queueCaps.countWaitingForWorkspace.mockResolvedValue(200);
        queueCaps.shouldLogDrop.mockResolvedValue(false);
        await enqueue('blockSync', 'blockSync-1-1', { workspaceId: 1, blockNumber: 1 });
        expect(logger.warn).not.toHaveBeenCalled();
    });
});

describe('bulkEnqueue cap enforcement', () => {
    it('passes through when queue is uncapped', async () => {
        queueCaps.getCap.mockReturnValue(Infinity);
        const jobs = [
            { name: 'a', data: { workspaceId: 1 } },
            { name: 'b', data: { workspaceId: 2 } },
        ];
        await bulkEnqueue('blockSync', jobs);
        expect(queues['blockSync'].addBulk).toHaveBeenCalledTimes(1);
        expect(queues['blockSync'].addBulk.mock.calls[0][0]).toHaveLength(2);
    });

    it('passes through jobs without workspaceId', async () => {
        queueCaps.getCap.mockReturnValue(200);
        const jobs = [{ name: 'a', data: {} }, { name: 'b', data: {} }];
        await bulkEnqueue('blockSync', jobs);
        expect(queues['blockSync'].addBulk.mock.calls[0][0]).toHaveLength(2);
        expect(queueCaps.isLowTierWorkspace).not.toHaveBeenCalled();
    });

    it('passes through jobs for non-low-tier workspaces', async () => {
        queueCaps.getCap.mockReturnValue(200);
        queueCaps.isLowTierWorkspace.mockResolvedValue(false);
        const jobs = [
            { name: 'a', data: { workspaceId: 1 } },
            { name: 'b', data: { workspaceId: 1 } },
        ];
        await bulkEnqueue('blockSync', jobs);
        expect(queues['blockSync'].addBulk.mock.calls[0][0]).toHaveLength(2);
    });

    it('drops jobs over the remaining capacity for a low-tier workspace', async () => {
        queueCaps.getCap.mockReturnValue(200);
        queueCaps.isLowTierWorkspace.mockResolvedValue(true);
        queueCaps.countWaitingForWorkspace.mockResolvedValue(195);
        const jobs = [];
        for (let i = 0; i < 20; i++) jobs.push({ name: `j${i}`, data: { workspaceId: 1 } });
        await bulkEnqueue('blockSync', jobs);
        expect(queues['blockSync'].addBulk.mock.calls[0][0]).toHaveLength(5);
        expect(logger.warn).toHaveBeenCalledWith(
            expect.stringMatching(/cap reached/i),
            expect.objectContaining({ queueName: 'blockSync', workspaceId: 1, cap: 200, dropped: 15 })
        );
    });

    it('drops all jobs when already at cap', async () => {
        queueCaps.getCap.mockReturnValue(200);
        queueCaps.isLowTierWorkspace.mockResolvedValue(true);
        queueCaps.countWaitingForWorkspace.mockResolvedValue(200);
        const jobs = [{ name: 'a', data: { workspaceId: 1 } }];
        await bulkEnqueue('blockSync', jobs);
        expect(queues['blockSync'].addBulk).not.toHaveBeenCalled();
    });

    it('handles mixed workspaces independently', async () => {
        queueCaps.getCap.mockReturnValue(200);
        queueCaps.isLowTierWorkspace.mockImplementation(async (id) => id === 1);
        queueCaps.countWaitingForWorkspace.mockResolvedValue(199);
        const jobs = [
            { name: 'a1', data: { workspaceId: 1 } },
            { name: 'a2', data: { workspaceId: 1 } },
            { name: 'b1', data: { workspaceId: 2 } },
            { name: 'b2', data: { workspaceId: 2 } },
        ];
        await bulkEnqueue('blockSync', jobs);
        // ws 1 (low-tier, 199 waiting, cap 200) → 1 of 2 jobs allowed
        // ws 2 (normal-tier) → both jobs allowed
        // total enqueued = 3
        const sent = queues['blockSync'].addBulk.mock.calls[0][0];
        expect(sent).toHaveLength(3);
    });
});

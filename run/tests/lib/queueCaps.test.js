jest.mock('../../lib/env', () => ({
    queueCapBlockSync: () => 200,
    queueCapReceiptSync: () => 5000,
    queueCapTierCacheTtlSeconds: () => 60,
}));

jest.mock('../../lib/logger', () => ({ warn: jest.fn(), info: jest.fn(), error: jest.fn() }));

const { getCap } = require('../../lib/queueCaps');

describe('getCap', () => {
    it('returns 200 for blockSync', () => {
        expect(getCap('blockSync')).toBe(200);
    });

    it('returns 5000 for receiptSync', () => {
        expect(getCap('receiptSync')).toBe(5000);
    });

    it('returns Infinity for any other queue', () => {
        expect(getCap('processContract')).toBe(Infinity);
        expect(getCap('integrityCheck')).toBe(Infinity);
        expect(getCap('')).toBe(Infinity);
    });
});

const { parseWorkspaceFromJobName } = require('../../lib/queueCaps');

describe('parseWorkspaceFromJobName', () => {
    it('parses blockSync job name', () => {
        expect(parseWorkspaceFromJobName('blockSync', 'blockSync-15537-52060280')).toBe(15537);
    });

    it('parses blockSync batch job name', () => {
        expect(parseWorkspaceFromJobName('blockSync', 'blockSync-batch-uid-myWorkspace-1234')).toBeNull();
    });

    it('parses receiptSync job name', () => {
        expect(parseWorkspaceFromJobName('receiptSync', 'receiptSync-17066-0xabcdef')).toBe(17066);
    });

    it('returns null for non-matching name', () => {
        expect(parseWorkspaceFromJobName('blockSync', 'something-else')).toBeNull();
        expect(parseWorkspaceFromJobName('blockSync', '')).toBeNull();
        expect(parseWorkspaceFromJobName('blockSync', null)).toBeNull();
    });

    it('returns null for unsupported queue', () => {
        expect(parseWorkspaceFromJobName('processContract', 'processContract-1-0xabc')).toBeNull();
    });
});

jest.mock('../../models', () => ({
    Workspace: { findByPk: jest.fn() },
}));

const { Workspace } = require('../../models');
const { evaluateTier } = require('../../lib/queueCaps');

describe('evaluateTier', () => {
    beforeEach(() => Workspace.findByPk.mockReset());

    const stub = (overrides) => ({
        id: 1,
        explorer: {
            isDemo: false,
            stripeSubscription: {
                status: 'active',
                stripePlan: { slug: 'explorer-150' }
            }
        },
        ...overrides
    });

    it('returns "low" when workspace has no explorer', async () => {
        Workspace.findByPk.mockResolvedValue(stub({ explorer: null }));
        expect(await evaluateTier(1)).toBe('low');
    });

    it('returns "low" when explorer has no subscription', async () => {
        Workspace.findByPk.mockResolvedValue(stub({ explorer: { stripeSubscription: null } }));
        expect(await evaluateTier(1)).toBe('low');
    });

    it('returns "low" when subscription status is trial', async () => {
        Workspace.findByPk.mockResolvedValue(stub({
            explorer: { stripeSubscription: { status: 'trial', stripePlan: { slug: 'explorer-150' } } }
        }));
        expect(await evaluateTier(1)).toBe('low');
    });

    it('returns "low" for canceled subscription', async () => {
        Workspace.findByPk.mockResolvedValue(stub({
            explorer: { isDemo: false, stripeSubscription: { status: 'canceled', stripePlan: { slug: 'explorer-150' } } }
        }));
        expect(await evaluateTier(1)).toBe('low');
    });

    it('returns "low" for past_due subscription', async () => {
        Workspace.findByPk.mockResolvedValue(stub({
            explorer: { isDemo: false, stripeSubscription: { status: 'past_due', stripePlan: { slug: 'explorer-150' } } }
        }));
        expect(await evaluateTier(1)).toBe('low');
    });

    it('returns "low" for unpaid subscription', async () => {
        Workspace.findByPk.mockResolvedValue(stub({
            explorer: { isDemo: false, stripeSubscription: { status: 'unpaid', stripePlan: { slug: 'explorer-150' } } }
        }));
        expect(await evaluateTier(1)).toBe('low');
    });

    it('returns "low" for incomplete_expired subscription', async () => {
        Workspace.findByPk.mockResolvedValue(stub({
            explorer: { isDemo: false, stripeSubscription: { status: 'incomplete_expired', stripePlan: { slug: 'explorer-150' } } }
        }));
        expect(await evaluateTier(1)).toBe('low');
    });

    it('returns "low" when plan slug is free', async () => {
        Workspace.findByPk.mockResolvedValue(stub({
            explorer: { stripeSubscription: { status: 'active', stripePlan: { slug: 'free' } } }
        }));
        expect(await evaluateTier(1)).toBe('low');
    });

    it('returns "low" when explorer.isDemo is true', async () => {
        Workspace.findByPk.mockResolvedValue(stub({
            explorer: {
                isDemo: true,
                stripeSubscription: { status: 'active', stripePlan: { slug: 'explorer-150' } }
            }
        }));
        expect(await evaluateTier(1)).toBe('low');
    });

    it('returns "normal" when subscription exists but stripePlan is null (fail open)', async () => {
        Workspace.findByPk.mockResolvedValue(stub({
            explorer: { isDemo: false, stripeSubscription: { status: 'active', stripePlan: null } }
        }));
        expect(await evaluateTier(1)).toBe('normal');
    });

    it('returns "normal" for paid explorer-150', async () => {
        Workspace.findByPk.mockResolvedValue(stub());
        expect(await evaluateTier(1)).toBe('normal');
    });

    it('returns "normal" for trial_with_card', async () => {
        Workspace.findByPk.mockResolvedValue(stub({
            explorer: { stripeSubscription: { status: 'trial_with_card', stripePlan: { slug: 'explorer-150' } } }
        }));
        expect(await evaluateTier(1)).toBe('normal');
    });

    it('returns "normal" when workspace not found', async () => {
        Workspace.findByPk.mockResolvedValue(null);
        expect(await evaluateTier(1)).toBe('normal');
    });

    it('returns "normal" on DB error (fail open)', async () => {
        Workspace.findByPk.mockRejectedValue(new Error('boom'));
        expect(await evaluateTier(1)).toBe('normal');
    });
});

jest.mock('../../lib/redis', () => ({
    get: jest.fn(),
    set: jest.fn(),
    eval: jest.fn(),
}));

const redis = require('../../lib/redis');
const { isLowTierWorkspace } = require('../../lib/queueCaps');

describe('isLowTierWorkspace', () => {
    beforeEach(() => {
        Workspace.findByPk.mockReset();
        redis.get.mockReset();
        redis.set.mockReset();
    });

    it('returns true on cache hit "low"', async () => {
        redis.get.mockResolvedValue('low');
        expect(await isLowTierWorkspace(1)).toBe(true);
        expect(Workspace.findByPk).not.toHaveBeenCalled();
    });

    it('returns false on cache hit "normal"', async () => {
        redis.get.mockResolvedValue('normal');
        expect(await isLowTierWorkspace(1)).toBe(false);
        expect(Workspace.findByPk).not.toHaveBeenCalled();
    });

    it('on cache miss evaluates, caches, returns', async () => {
        redis.get.mockResolvedValue(null);
        Workspace.findByPk.mockResolvedValue({
            id: 1,
            explorer: { isDemo: true, stripeSubscription: null }
        });
        const result = await isLowTierWorkspace(1);
        expect(result).toBe(true);
        expect(redis.set).toHaveBeenCalledWith('queueCap:tier:1', 'low', 'EX', 60);
    });

    it('returns false on Redis get failure', async () => {
        redis.get.mockRejectedValue(new Error('boom'));
        expect(await isLowTierWorkspace(1)).toBe(false);
    });

    it('returns false on undefined/null workspaceId', async () => {
        expect(await isLowTierWorkspace(null)).toBe(false);
        expect(await isLowTierWorkspace(undefined)).toBe(false);
    });
});

const { countWaitingForWorkspace } = require('../../lib/queueCaps');

describe('countWaitingForWorkspace', () => {
    beforeEach(() => {
        redis.eval.mockReset();
    });

    it('calls EVAL with the queue prefix, workspaceId, and returns numeric sum', async () => {
        redis.eval.mockResolvedValue(7);
        const count = await countWaitingForWorkspace('blockSync', 17061);
        expect(count).toBe(7);
        expect(redis.eval).toHaveBeenCalledTimes(1);
        const callArgs = redis.eval.mock.calls[0];
        expect(callArgs[1]).toBe(2);                     // numkeys
        expect(callArgs[2]).toBe('bull:blockSync:wait');
        expect(callArgs[3]).toBe('bull:blockSync:prioritized');
        expect(callArgs[4]).toBe('blockSync-17061-');
    });

    it('returns 0 when EVAL throws (fail open)', async () => {
        redis.eval.mockRejectedValue(new Error('boom'));
        const count = await countWaitingForWorkspace('blockSync', 17061);
        expect(count).toBe(0);
    });
});

const { shouldLogDrop } = require('../../lib/queueCaps');

describe('shouldLogDrop', () => {
    beforeEach(() => redis.set.mockReset());

    it('returns true on first call (key set)', async () => {
        redis.set.mockResolvedValue('OK');
        const result = await shouldLogDrop('blockSync', 17061);
        expect(result).toBe(true);
        expect(redis.set).toHaveBeenCalledWith(
            'queueCap:dropLog:blockSync:17061', '1', 'NX', 'EX', 3600
        );
    });

    it('returns false on subsequent call (key already set)', async () => {
        redis.set.mockResolvedValue(null);
        const result = await shouldLogDrop('blockSync', 17061);
        expect(result).toBe(false);
    });

    it('returns true (log it) on Redis failure', async () => {
        redis.set.mockRejectedValue(new Error('boom'));
        const result = await shouldLogDrop('blockSync', 17061);
        expect(result).toBe(true);
    });
});

const { scanQueueByWorkspace, trimOldest } = require('../../lib/queueCaps');

describe('scanQueueByWorkspace', () => {
    beforeEach(() => redis.eval.mockReset());

    it('parses flat result into [workspaceId, count] map', async () => {
        redis.eval.mockResolvedValue(['17061', '6944', '15537', '7072']);
        const result = await scanQueueByWorkspace('blockSync');
        expect(result).toEqual(new Map([[17061, 6944], [15537, 7072]]));
    });

    it('returns empty map on EVAL error', async () => {
        redis.eval.mockRejectedValue(new Error('boom'));
        expect(await scanQueueByWorkspace('blockSync')).toEqual(new Map());
    });
});

describe('trimOldest', () => {
    beforeEach(() => redis.eval.mockReset());

    it('calls EVAL with the right keys, queue, workspaceId, excess', async () => {
        redis.eval.mockResolvedValue(15);
        const removed = await trimOldest('blockSync', 17061, 15);
        expect(removed).toBe(15);
        const args = redis.eval.mock.calls[0];
        expect(args[1]).toBe(2);
        expect(args[2]).toBe('bull:blockSync:wait');
        expect(args[3]).toBe('bull:blockSync:prioritized');
        expect(args[4]).toBe('blockSync-17061-');
        expect(args[5]).toBe('15');
        expect(args[6]).toBe('bull:blockSync:');
    });

    it('returns 0 on EVAL error', async () => {
        redis.eval.mockRejectedValue(new Error('boom'));
        expect(await trimOldest('blockSync', 17061, 15)).toBe(0);
    });

    it('returns 0 when excess <= 0', async () => {
        expect(await trimOldest('blockSync', 17061, 0)).toBe(0);
        expect(redis.eval).not.toHaveBeenCalled();
    });
});

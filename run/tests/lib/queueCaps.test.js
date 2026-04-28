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

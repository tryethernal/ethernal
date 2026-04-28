jest.mock('../../lib/env', () => ({
    queueCapBlockSync: () => 200,
    queueCapReceiptSync: () => 5000,
    queueCapTierCacheTtlSeconds: () => 60,
}));

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

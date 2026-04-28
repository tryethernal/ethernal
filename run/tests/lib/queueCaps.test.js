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

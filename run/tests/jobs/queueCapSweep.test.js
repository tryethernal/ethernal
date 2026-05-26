require('../mocks/lib/logger');

jest.mock('../../lib/queueCaps', () => ({
    getCap: jest.fn(),
    isLowTierWorkspace: jest.fn(),
    scanQueueByWorkspace: jest.fn(),
    trimOldest: jest.fn(),
}));

const logger = require('../../lib/logger');
const queueCaps = require('../../lib/queueCaps');
const queueCapSweep = require('../../jobs/queueCapSweep');

describe('queueCapSweep', () => {
    beforeEach(() => {
        queueCaps.getCap.mockReset().mockImplementation(name => {
            if (name === 'blockSync') return 200;
            if (name === 'receiptSync') return 5000;
            return Infinity;
        });
        queueCaps.isLowTierWorkspace.mockReset().mockResolvedValue(false);
        queueCaps.scanQueueByWorkspace.mockReset().mockResolvedValue(new Map());
        queueCaps.trimOldest.mockReset().mockResolvedValue(0);
        logger.info.mockReset();
        logger.error.mockReset();
    });

    it('does nothing when scan returns empty', async () => {
        await queueCapSweep();
        expect(queueCaps.trimOldest).not.toHaveBeenCalled();
    });

    it('skips workspaces under cap', async () => {
        queueCaps.scanQueueByWorkspace.mockResolvedValue(new Map([[17061, 100]]));
        await queueCapSweep();
        expect(queueCaps.isLowTierWorkspace).not.toHaveBeenCalled();
        expect(queueCaps.trimOldest).not.toHaveBeenCalled();
    });

    it('skips non-low-tier workspaces over cap', async () => {
        queueCaps.scanQueueByWorkspace.mockResolvedValue(new Map([[17061, 5000]]));
        queueCaps.isLowTierWorkspace.mockResolvedValue(false);
        await queueCapSweep();
        expect(queueCaps.trimOldest).not.toHaveBeenCalled();
    });

    it('trims excess for low-tier workspace over cap', async () => {
        queueCaps.scanQueueByWorkspace.mockImplementation(async (q) => {
            if (q === 'blockSync') return new Map([[17061, 350]]);
            return new Map();
        });
        queueCaps.isLowTierWorkspace.mockResolvedValue(true);
        queueCaps.trimOldest.mockResolvedValue(150);
        await queueCapSweep();
        expect(queueCaps.trimOldest).toHaveBeenCalledWith('blockSync', 17061, 150);
        expect(logger.info).toHaveBeenCalledWith(
            'Sweep trimmed jobs',
            expect.objectContaining({ queueName: 'blockSync', workspaceId: 17061, removed: 150 })
        );
    });

    it('does not log when trim removed nothing', async () => {
        queueCaps.scanQueueByWorkspace.mockResolvedValue(new Map([[17061, 350]]));
        queueCaps.isLowTierWorkspace.mockResolvedValue(true);
        queueCaps.trimOldest.mockResolvedValue(0);
        await queueCapSweep();
        expect(logger.info).not.toHaveBeenCalled();
    });

    it('continues sweeping receiptSync if blockSync scan throws', async () => {
        queueCaps.scanQueueByWorkspace.mockImplementation(async (q) => {
            if (q === 'blockSync') throw new Error('boom');
            return new Map([[17066, 6000]]);
        });
        queueCaps.isLowTierWorkspace.mockResolvedValue(true);
        queueCaps.trimOldest.mockResolvedValue(1000);
        await queueCapSweep();
        expect(queueCaps.trimOldest).toHaveBeenCalledWith('receiptSync', 17066, 1000);
        expect(logger.error).toHaveBeenCalledWith(
            'Sweep failed',
            expect.objectContaining({ queueName: 'blockSync', error: 'boom' })
        );
    });

    it('skips queues with Infinity cap', async () => {
        queueCaps.getCap.mockReturnValue(Infinity);
        await queueCapSweep();
        expect(queueCaps.scanQueueByWorkspace).not.toHaveBeenCalled();
    });
});

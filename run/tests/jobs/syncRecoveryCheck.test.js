const { Explorer, Workspace } = require('../mocks/models');
require('../mocks/lib/rpc');
require('../mocks/lib/utils');
require('../mocks/lib/logger');

const { ProviderConnector } = require('../../lib/rpc');
const syncRecoveryCheck = require('../../jobs/syncRecoveryCheck');

beforeEach(() => jest.clearAllMocks());

describe('syncRecoveryCheck', () => {
    it('Should return early if no explorers need recovery check', async () => {
        jest.spyOn(Explorer, 'findAll').mockResolvedValueOnce([]);

        const result = await syncRecoveryCheck();

        expect(result).toEqual('No explorers due for recovery check');
    });

    it('Should re-enable sync when RPC is reachable', async () => {
        const mockEnableSyncAfterRecovery = jest.fn().mockResolvedValue({});
        jest.spyOn(Explorer, 'findAll').mockResolvedValueOnce([{
            id: 1,
            slug: 'test-explorer',
            syncDisabledReason: 'rpc_unreachable',
            enableSyncAfterRecovery: mockEnableSyncAfterRecovery,
            scheduleNextRecoveryCheck: jest.fn(),
            workspace: {
                id: 1,
                rpcServer: 'http://localhost:8545'
            }
        }]);
        ProviderConnector.mockImplementation(() => ({
            fetchLatestBlock: jest.fn().mockResolvedValue({ number: 100 })
        }));

        const result = await syncRecoveryCheck();

        expect(mockEnableSyncAfterRecovery).toHaveBeenCalled();
        expect(result).toEqual('Checked 1 explorers: 1 recovered, 0 still unreachable');
    });

    it('Should schedule next recovery check when RPC is still unreachable', async () => {
        const mockScheduleNextRecoveryCheck = jest.fn().mockResolvedValue({});
        jest.spyOn(Explorer, 'findAll').mockResolvedValueOnce([{
            id: 1,
            slug: 'test-explorer',
            syncDisabledReason: 'rpc_unreachable',
            enableSyncAfterRecovery: jest.fn(),
            scheduleNextRecoveryCheck: mockScheduleNextRecoveryCheck,
            workspace: {
                id: 1,
                rpcServer: 'http://localhost:8545'
            }
        }]);
        ProviderConnector.mockImplementation(() => ({
            fetchLatestBlock: jest.fn().mockResolvedValue(null)
        }));

        const result = await syncRecoveryCheck();

        expect(mockScheduleNextRecoveryCheck).toHaveBeenCalled();
        expect(result).toEqual('Checked 1 explorers: 0 recovered, 1 still unreachable');
    });

    it('Should schedule next recovery check when RPC check throws error', async () => {
        const mockScheduleNextRecoveryCheck = jest.fn().mockResolvedValue({});
        jest.spyOn(Explorer, 'findAll').mockResolvedValueOnce([{
            id: 1,
            slug: 'test-explorer',
            syncDisabledReason: 'rpc_unreachable',
            enableSyncAfterRecovery: jest.fn(),
            scheduleNextRecoveryCheck: mockScheduleNextRecoveryCheck,
            workspace: {
                id: 1,
                rpcServer: 'http://localhost:8545'
            }
        }]);
        ProviderConnector.mockImplementation(() => ({
            fetchLatestBlock: jest.fn().mockRejectedValue(new Error('Connection refused'))
        }));

        const result = await syncRecoveryCheck();

        expect(mockScheduleNextRecoveryCheck).toHaveBeenCalled();
        expect(result).toEqual('Checked 1 explorers: 0 recovered, 1 still unreachable');
    });

    it('Should handle multiple explorers with mixed results', async () => {
        const mockEnableSyncAfterRecovery1 = jest.fn().mockResolvedValue({});
        const mockScheduleNextRecoveryCheck2 = jest.fn().mockResolvedValue({});

        jest.spyOn(Explorer, 'findAll').mockResolvedValueOnce([
            {
                id: 1,
                slug: 'explorer-1',
                syncDisabledReason: 'rpc_unreachable',
                enableSyncAfterRecovery: mockEnableSyncAfterRecovery1,
                scheduleNextRecoveryCheck: jest.fn(),
                workspace: {
                    id: 1,
                    rpcServer: 'http://working-rpc:8545'
                }
            },
            {
                id: 2,
                slug: 'explorer-2',
                syncDisabledReason: 'rpc_unreachable',
                enableSyncAfterRecovery: jest.fn(),
                scheduleNextRecoveryCheck: mockScheduleNextRecoveryCheck2,
                workspace: {
                    id: 2,
                    rpcServer: 'http://broken-rpc:8545'
                }
            }
        ]);

        let callCount = 0;
        ProviderConnector.mockImplementation(() => ({
            fetchLatestBlock: jest.fn().mockImplementation(() => {
                callCount++;
                if (callCount === 1) {
                    return Promise.resolve({ number: 100 });
                }
                return Promise.resolve(null);
            })
        }));

        const result = await syncRecoveryCheck();

        expect(mockEnableSyncAfterRecovery1).toHaveBeenCalled();
        expect(mockScheduleNextRecoveryCheck2).toHaveBeenCalled();
        expect(result).toEqual('Checked 2 explorers: 1 recovered, 1 still unreachable');
    });
});

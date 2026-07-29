require('../mocks/lib/queue');
require('../mocks/lib/logger');
require('../mocks/models');

jest.mock('../../lib/redis', () => ({
    set: jest.fn().mockResolvedValue('OK')
}));

const redis = require('../../lib/redis');
const { OrbitBatch, Workspace } = require('../mocks/models');
const finalizePendingOrbitBatches = require('../../jobs/finalizePendingOrbitBatches');

// Mock dependencies
jest.mock('../../lib/queue');
jest.mock('../../lib/logger');

beforeEach(() => jest.clearAllMocks());

describe('finalizePendingOrbitBatches', () => {
    let mockWorkspaces;
    let mockOrbitChildConfigs;
    let mockViemClient;
    let mockBlock;
    let mockPendingBatches;

    beforeEach(() => {
        // Reset mocks
        jest.clearAllMocks();

        // Mock orbit child configs
        mockOrbitChildConfigs = [
            {
                id: 10,
                workspaceId: 101
            },
            {
                id: 11,
                workspaceId: 102
            }
        ];

        // Mock viem client
        mockViemClient = {
            getBlock: jest.fn()
        };

        // Mock block
        mockBlock = {
            number: 1000
        };

        // Mock pending batches
        mockPendingBatches = [
            {
                id: 1,
                workspaceId: 101,
                confirmationStatus: 'pending',
                parentChainBlockNumber: 999,
                confirm: jest.fn()
            },
            {
                id: 2,
                workspaceId: 101,
                confirmationStatus: 'pending',
                parentChainBlockNumber: 998,
                confirm: jest.fn()
            }
        ];

        // Mock workspaces with isTopL1Parent: true
        mockWorkspaces = [
            {
                id: 1,
                name: 'Parent Workspace 1',
                isTopL1Parent: true,
                rpcServer: 'https://parent-1.example.com',
                orbitChildConfigs: mockOrbitChildConfigs,
                getViemPublicClient: jest.fn().mockReturnValue(mockViemClient)
            },
            {
                id: 2,
                name: 'Parent Workspace 2',
                isTopL1Parent: true,
                rpcServer: 'https://parent-2.example.com',
                orbitChildConfigs: [],
                getViemPublicClient: jest.fn().mockReturnValue(mockViemClient)
            }
        ];

        // Setup mocks
        Workspace.findAll.mockResolvedValue(mockWorkspaces);
        mockViemClient.getBlock.mockResolvedValue(mockBlock);
        OrbitBatch.findAll.mockResolvedValue(mockPendingBatches);
    });

    describe('basic functionality', () => {
        it('should find workspaces with isTopL1Parent: true', async () => {
            await finalizePendingOrbitBatches();

            expect(Workspace.findAll).toHaveBeenCalledWith({
                include: ['orbitChildConfigs'],
                where: {
                    [require('sequelize').Op.or]: [
                        { isTopL1Parent: true },
                        { isCustomL1Parent: true }
                    ]
                }
            });
        });

        it('should get viem public client for each workspace', async () => {
            await finalizePendingOrbitBatches();

            expect(mockWorkspaces[0].getViemPublicClient).toHaveBeenCalled();
            expect(mockWorkspaces[1].getViemPublicClient).toHaveBeenCalled();
        });

        it('should get safe block for each workspace', async () => {
            await finalizePendingOrbitBatches();

            expect(mockViemClient.getBlock).toHaveBeenCalledWith({ blockTag: 'safe' });
        });

        it('should find pending batches for each orbit child config', async () => {
            await finalizePendingOrbitBatches();

            expect(OrbitBatch.findAll).toHaveBeenCalledWith({
                where: {
                    workspaceId: 101,
                    confirmationStatus: 'pending',
                    parentChainBlockNumber: {
                        [require('sequelize').Op.lt]: 1000
                    }
                }
            });
        });

        it('should confirm each pending batch', async () => {
            await finalizePendingOrbitBatches();

            expect(mockPendingBatches[0].confirm).toHaveBeenCalled();
            expect(mockPendingBatches[1].confirm).toHaveBeenCalled();
        });

        it('should return array of batch IDs', async () => {
            const result = await finalizePendingOrbitBatches();

            // We have 2 workspaces, first has 2 child configs with 2 batches each, second has 0 child configs
            // So we expect 4 batch IDs total (2 batches × 2 child configs)
            expect(result).toEqual([1, 2, 1, 2]);
        });
    });

    describe('multiple workspaces', () => {
        it('should process multiple workspaces correctly', async () => {
            const mockWorkspace2 = {
                id: 2,
                name: 'Parent Workspace 2',
                isTopL1Parent: true,
                rpcServer: 'https://parent-2.example.com',
                orbitChildConfigs: [],
                getViemPublicClient: jest.fn().mockReturnValue({
                    getBlock: jest.fn().mockResolvedValue({ number: 2000 })
                })
            };

            mockWorkspaces.push(mockWorkspace2);

            await finalizePendingOrbitBatches();

            expect(Workspace.findAll).toHaveBeenCalledWith({
                include: ['orbitChildConfigs'],
                where: {
                    [require('sequelize').Op.or]: [
                        { isTopL1Parent: true },
                        { isCustomL1Parent: true }
                    ]
                }
            });
        });
    });

    describe('multiple child configs', () => {
        it('should process multiple child configs for each workspace', async () => {
            const extendedChildConfigs = [
                { id: 10, workspaceId: 101 },
                { id: 11, workspaceId: 102 },
                { id: 12, workspaceId: 103 }
            ];

            mockWorkspaces[0].orbitChildConfigs = extendedChildConfigs;

            // Mock multiple batch results for different child configs
            OrbitBatch.findAll
                .mockResolvedValueOnce([mockPendingBatches[0]]) // For workspaceId 101
                .mockResolvedValueOnce([mockPendingBatches[1]]) // For workspaceId 102
                .mockResolvedValueOnce([]); // For workspaceId 103

            await finalizePendingOrbitBatches();

            expect(OrbitBatch.findAll).toHaveBeenCalledTimes(3);
        });
    });

    describe('no pending batches', () => {
        it('should handle case when no pending batches exist', async () => {
            OrbitBatch.findAll.mockResolvedValue([]);

            const result = await finalizePendingOrbitBatches();

            expect(result).toEqual([]);
        });
    });

    describe('empty workspaces', () => {
        it('should handle case when no workspaces exist', async () => {
            Workspace.findAll.mockResolvedValue([]);

            const result = await finalizePendingOrbitBatches();

            expect(result).toEqual([]);
        });
    });

    describe('empty child configs', () => {
        it('should handle case when no child configs exist', async () => {
            mockWorkspaces[0].orbitChildConfigs = [];

            const result = await finalizePendingOrbitBatches();

            expect(result).toEqual([]);
        });
    });

    describe('block number handling', () => {
        it('should convert BigInt block number to Number for comparison', async () => {
            mockBlock.number = 5000;

            await finalizePendingOrbitBatches();

            expect(OrbitBatch.findAll).toHaveBeenCalledWith({
                where: {
                    workspaceId: 101,
                    confirmationStatus: 'pending',
                    parentChainBlockNumber: {
                        [require('sequelize').Op.lt]: 5000
                    }
                }
            });
        });

        it('should handle zero block number', async () => {
            mockBlock.number = 0;

            await finalizePendingOrbitBatches();

            expect(OrbitBatch.findAll).toHaveBeenCalledWith({
                where: {
                    workspaceId: 101,
                    confirmationStatus: 'pending',
                    parentChainBlockNumber: {
                        [require('sequelize').Op.lt]: 0
                    }
                }
            });
        });
    });

    describe('error handling', () => {
        it('should not swallow a failure to load the workspaces', async () => {
            // Nothing was attempted, so there is nothing to isolate — this one
            // still has to surface.
            Workspace.findAll.mockRejectedValue(new Error('Workspace find error'));

            await expect(finalizePendingOrbitBatches()).rejects.toThrow('Workspace find error');
        });

        it('should report which parent chain failed, and why', async () => {
            mockViemClient.getBlock.mockRejectedValue(new Error('HTTP request failed.'));

            await expect(finalizePendingOrbitBatches())
                .rejects.toThrow(/Parent Workspace 1 \(#1\): HTTP request failed\./);
        });

        it('should surface errors from OrbitBatch.findAll', async () => {
            OrbitBatch.findAll.mockRejectedValue(new Error('Batch find error'));

            await expect(finalizePendingOrbitBatches()).rejects.toThrow(/Batch find error/);
        });

        it('should surface errors from batch.confirm', async () => {
            mockPendingBatches[0].confirm.mockRejectedValue(new Error('Confirm error'));

            await expect(finalizePendingOrbitBatches()).rejects.toThrow(/Confirm error/);
        });

        it('should skip a workspace with no RPC server instead of failing', async () => {
            mockWorkspaces[0].rpcServer = null;

            const result = await finalizePendingOrbitBatches();

            expect(result).toEqual([]);
            expect(mockWorkspaces[0].getViemPublicClient).not.toHaveBeenCalled();
        });
    });

    describe('isolation between parent chains', () => {
        // The bug this job shipped with: one unreachable RPC aborted the whole
        // sweep, so every other chain silently stopped being finalized.
        beforeEach(() => {
            mockWorkspaces[1].orbitChildConfigs = [{ id: 20, workspaceId: 201 }];
            mockWorkspaces[1].getViemPublicClient = jest.fn().mockReturnValue({
                getBlock: jest.fn().mockResolvedValue({ number: 2000 })
            });
            mockWorkspaces[0].getViemPublicClient = jest.fn().mockReturnValue({
                getBlock: jest.fn().mockRejectedValue(new Error('HTTP request failed.'))
            });
        });

        it('should still finalize the healthy chains when one RPC is down', async () => {
            await expect(finalizePendingOrbitBatches()).rejects.toThrow();

            // The healthy chain's batches were confirmed despite the failure.
            expect(OrbitBatch.findAll).toHaveBeenCalledWith(expect.objectContaining({
                where: expect.objectContaining({ workspaceId: 201 })
            }));
            expect(mockPendingBatches[0].confirm).toHaveBeenCalled();
        });

        it('should say how many chains failed out of how many', async () => {
            await expect(finalizePendingOrbitBatches())
                .rejects.toThrow(/1 of 2 parent chain\(s\)/);
        });
    });

    describe('Sentry throttling', () => {
        // This job runs every 30s. Reporting an unreachable RPC on every tick
        // burned more than the whole monthly error quota in ten hours.
        beforeEach(() => {
            mockViemClient.getBlock.mockRejectedValue(new Error('HTTP request failed.'));
        });

        it('should report the first occurrence for a given set of chains', async () => {
            redis.set.mockResolvedValue('OK');

            await expect(finalizePendingOrbitBatches()).rejects.toMatchObject({ sentryIgnore: false });
        });

        it('should stay quiet while the same chains keep failing', async () => {
            redis.set.mockResolvedValue(null);

            await expect(finalizePendingOrbitBatches()).rejects.toMatchObject({ sentryIgnore: true });
        });

        it('should key the throttle on the failing chains, not the job', async () => {
            await expect(finalizePendingOrbitBatches()).rejects.toThrow();

            expect(redis.set).toHaveBeenCalledWith(
                expect.stringMatching(/^orbitBatchFinalization:rpcFailure:1,2:[0-9a-f]{12}$/),
                '1', 'NX', 'EX', 3600
            );
        });

        it('should treat a different fault on the same chain as a new report', async () => {
            // Otherwise an RPC outage would mask a database error that happened
            // to land on the same chain, for up to an hour, while batches sit
            // unconfirmed.
            await expect(finalizePendingOrbitBatches()).rejects.toThrow();
            const rpcKey = redis.set.mock.calls[0][0];

            redis.set.mockClear();
            mockViemClient.getBlock.mockResolvedValue(mockBlock);
            OrbitBatch.findAll.mockRejectedValue(new Error('deadlock detected'));

            await expect(finalizePendingOrbitBatches()).rejects.toThrow();

            expect(redis.set.mock.calls[0][0]).not.toEqual(rpcKey);
        });

        it('should keep the same key while one fault repeats with volatile detail', async () => {
            // Block numbers and durations move on every tick; if they reached
            // the key, nothing would ever be throttled.
            mockViemClient.getBlock.mockRejectedValue(new Error('Timed out after 15000 ms. at block 0xa1b2c3'));
            await expect(finalizePendingOrbitBatches()).rejects.toThrow();
            const firstKey = redis.set.mock.calls[0][0];

            redis.set.mockClear();
            mockViemClient.getBlock.mockRejectedValue(new Error('Timed out after 15000 ms. at block 0xf9e8d7'));
            await expect(finalizePendingOrbitBatches()).rejects.toThrow();

            expect(redis.set.mock.calls[0][0]).toEqual(firstKey);
        });

        it('should report rather than go silent when Redis is unavailable', async () => {
            redis.set.mockRejectedValue(new Error('Redis down'));

            await expect(finalizePendingOrbitBatches()).rejects.toMatchObject({ sentryIgnore: false });
        });
    });
});

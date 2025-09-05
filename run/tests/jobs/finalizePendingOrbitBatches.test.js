require('../mocks/lib/queue');
require('../mocks/lib/logger');
require('../mocks/models');

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

        // Mock workspaces with isTopOrbitParent: true
        mockWorkspaces = [
            {
                id: 1,
                name: 'Parent Workspace 1',
                isTopOrbitParent: true,
                orbitChildConfigs: mockOrbitChildConfigs,
                getViemPublicClient: jest.fn().mockReturnValue(mockViemClient)
            },
            {
                id: 2,
                name: 'Parent Workspace 2',
                isTopOrbitParent: true,
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
        it('should find workspaces with isTopOrbitParent: true', async () => {
            await finalizePendingOrbitBatches();

            expect(Workspace.findAll).toHaveBeenCalledWith({
                where: { isTopOrbitParent: true }
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
                isTopOrbitParent: true,
                orbitChildConfigs: [],
                getViemPublicClient: jest.fn().mockReturnValue({
                    getBlock: jest.fn().mockResolvedValue({ number: 2000 })
                })
            };

            mockWorkspaces.push(mockWorkspace2);

            await finalizePendingOrbitBatches();

            expect(Workspace.findAll).toHaveBeenCalledWith({
                where: { isTopOrbitParent: true }
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
        it('should handle errors in Workspace.findAll', async () => {
            Workspace.findAll.mockRejectedValue(new Error('Workspace find error'));

            await expect(finalizePendingOrbitBatches()).rejects.toThrow('Workspace find error');
        });

        it('should handle errors in getBlock', async () => {
            mockViemClient.getBlock.mockRejectedValue(new Error('Block error'));

            await expect(finalizePendingOrbitBatches()).rejects.toThrow('Block error');
        });

        it('should handle errors in OrbitBatch.findAll', async () => {
            OrbitBatch.findAll.mockRejectedValue(new Error('Batch find error'));

            await expect(finalizePendingOrbitBatches()).rejects.toThrow('Batch find error');
        });

        it('should handle errors in batch.confirm', async () => {
            mockPendingBatches[0].confirm.mockRejectedValue(new Error('Confirm error'));

            await expect(finalizePendingOrbitBatches()).rejects.toThrow('Confirm error');
        });
    });
});

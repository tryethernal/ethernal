require('../mocks/lib/queue');
require('../mocks/lib/logger');
require('../mocks/models');

const { OrbitBatch, OrbitChainConfig } = require('../mocks/models');
const finalizePendingOrbitBatches = require('../../jobs/finalizePendingOrbitBatches');

// Mock dependencies
jest.mock('../../lib/queue');
jest.mock('../../lib/logger');

beforeEach(() => jest.clearAllMocks());

describe('finalizePendingOrbitBatches', () => {
    let mockOrbitParentConfigs;
    let mockParentWorkspace;
    let mockOrbitChildConfigs;
    let mockViemClient;
    let mockBlock;
    let mockPendingBatches;

    beforeEach(() => {
        // Reset mocks
        jest.clearAllMocks();

        // Mock orbit parent configs
        mockOrbitParentConfigs = [
            {
                id: 1,
                workspaceId: 100,
                topParentChainBlockValidationType: 'SAFE',
                getTopParentWorkspace: jest.fn()
            },
            {
                id: 2,
                workspaceId: 200,
                topParentChainBlockValidationType: 'FINALIZED',
                getTopParentWorkspace: jest.fn()
            }
        ];

        // Mock parent workspace
        mockParentWorkspace = {
            id: 1,
            name: 'Parent Workspace',
            toJSON: jest.fn().mockReturnValue({
                id: 1,
                name: 'Parent Workspace'
            }),
            getOrbitChildConfigs: jest.fn(),
            getViemPublicClient: jest.fn()
        };

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
            number: 1000n
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

        // Setup mocks
        OrbitChainConfig.findAll.mockResolvedValue(mockOrbitParentConfigs);
        mockOrbitParentConfigs[0].getTopParentWorkspace.mockResolvedValue(mockParentWorkspace);
        mockOrbitParentConfigs[1].getTopParentWorkspace.mockResolvedValue(mockParentWorkspace);
        mockParentWorkspace.getOrbitChildConfigs.mockResolvedValue(mockOrbitChildConfigs);
        mockParentWorkspace.getViemPublicClient.mockReturnValue(mockViemClient);
        mockViemClient.getBlock.mockResolvedValue(mockBlock);
        OrbitBatch.findAll.mockResolvedValue(mockPendingBatches);
    });

    describe('basic functionality', () => {
        it('should find orbit parent configs with SAFE and FINALIZED validation types', async () => {
            await finalizePendingOrbitBatches();

            expect(OrbitChainConfig.findAll).toHaveBeenCalledWith({
                where: {
                    topParentChainBlockValidationType: {
                        [require('sequelize').Op.in]: ['SAFE', 'FINALIZED']
                    }
                }
            });
        });

        it('should get top parent workspace for each config', async () => {
            await finalizePendingOrbitBatches();

            expect(mockOrbitParentConfigs[0].getTopParentWorkspace).toHaveBeenCalled();
            expect(mockOrbitParentConfigs[1].getTopParentWorkspace).toHaveBeenCalled();
        });

        it('should get orbit child configs for each parent workspace', async () => {
            await finalizePendingOrbitBatches();

            expect(mockParentWorkspace.getOrbitChildConfigs).toHaveBeenCalled();
        });

        it('should get viem public client for each parent workspace', async () => {
            await finalizePendingOrbitBatches();

            expect(mockParentWorkspace.getViemPublicClient).toHaveBeenCalled();
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

            // Since we have 2 parent configs that both point to the same workspace,
            // and each workspace has 2 child configs, we expect 4 batch IDs total
            // (2 batches × 2 child configs × 1 workspace)
            expect(result).toEqual([1, 2, 1, 2]);
        });
    });

    describe('multiple parent configs', () => {
        it('should process multiple parent configs correctly', async () => {
            const mockParentWorkspace2 = {
                id: 2,
                name: 'Parent Workspace 2',
                toJSON: jest.fn().mockReturnValue({
                    id: 2,
                    name: 'Parent Workspace 2'
                }),
                getOrbitChildConfigs: jest.fn().mockResolvedValue([]),
                getViemPublicClient: jest.fn().mockReturnValue({
                    getBlock: jest.fn().mockResolvedValue({ number: 2000n })
                })
            };

            mockOrbitParentConfigs[1].getTopParentWorkspace.mockResolvedValue(mockParentWorkspace2);

            await finalizePendingOrbitBatches();

            expect(mockOrbitParentConfigs[0].getTopParentWorkspace).toHaveBeenCalled();
            expect(mockOrbitParentConfigs[1].getTopParentWorkspace).toHaveBeenCalled();
        });
    });

    describe('multiple child configs', () => {
        it('should process multiple child configs for each parent workspace', async () => {
            const extendedChildConfigs = [
                { id: 10, workspaceId: 101 },
                { id: 11, workspaceId: 102 },
                { id: 12, workspaceId: 103 }
            ];

            mockParentWorkspace.getOrbitChildConfigs.mockResolvedValue(extendedChildConfigs);

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

    describe('empty parent configs', () => {
        it('should handle case when no parent configs exist', async () => {
            OrbitChainConfig.findAll.mockResolvedValue([]);

            const result = await finalizePendingOrbitBatches();

            expect(result).toEqual([]);
        });
    });

    describe('empty child configs', () => {
        it('should handle case when no child configs exist', async () => {
            mockParentWorkspace.getOrbitChildConfigs.mockResolvedValue([]);

            const result = await finalizePendingOrbitBatches();

            expect(result).toEqual([]);
        });
    });

    describe('block number handling', () => {
        it('should convert BigInt block number to Number for comparison', async () => {
            mockBlock.number = 5000n;

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
            mockBlock.number = 0n;

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
        it('should handle errors in getTopParentWorkspace', async () => {
            mockOrbitParentConfigs[0].getTopParentWorkspace.mockRejectedValue(new Error('Workspace error'));

            await expect(finalizePendingOrbitBatches()).rejects.toThrow('Workspace error');
        });

        it('should handle errors in getOrbitChildConfigs', async () => {
            mockParentWorkspace.getOrbitChildConfigs.mockRejectedValue(new Error('Child configs error'));

            await expect(finalizePendingOrbitBatches()).rejects.toThrow('Child configs error');
        });

        it('should handle errors in getViemPublicClient', async () => {
            mockParentWorkspace.getViemPublicClient.mockImplementation(() => {
                throw new Error('Viem client error');
            });

            await expect(finalizePendingOrbitBatches()).rejects.toThrow('Viem client error');
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

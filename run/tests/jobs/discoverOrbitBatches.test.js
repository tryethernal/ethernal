require('../mocks/lib/rpc');
require('../mocks/lib/queue');
require('../mocks/lib/firebase');
require('../mocks/lib/logger');

const { OrbitBatch, OrbitChainConfig } = require('../mocks/models');
const { getOrbitConfig } = require('../../lib/orbitConfig');
const { ProductionRpcClient } = require('../../lib/orbitRetry');
const { ethers } = require('ethers');
const discoverOrbitBatches = require('../../jobs/discoverOrbitBatches');

// Mock dependencies
jest.mock('../../lib/orbitConfig');
jest.mock('../../lib/orbitRetry');
jest.mock('ethers');

afterEach(() => jest.clearAllMocks());

describe('discoverOrbitBatches', () => {
    let mockJob;
    let mockOrbitConfig;
    let mockParentProvider;
    let mockSequencerInbox;
    let mockContract;

    beforeEach(() => {
        // Reset mocks
        jest.clearAllMocks();

        // Mock job data
        mockJob = {
            id: 'test-job-id',
            data: { workspaceId: 1 }
        };

        // Mock orbit config
        mockOrbitConfig = {
            workspaceId: 1,
            parentChainRpcServer: 'https://eth-mainnet.alchemyapi.io/v2/test',
            sequencerInboxContract: '0x1234567890123456789012345678901234567890'
        };

        // Mock parent provider
        mockParentProvider = {
            getBlockNumber: jest.fn().mockResolvedValue(20000000),
            getBlock: jest.fn().mockResolvedValue({
                timestamp: 1640995200
            }),
            getTransaction: jest.fn().mockResolvedValue({
                gasPrice: { toString: () => '20000000000' }
            }),
            getTransactionReceipt: jest.fn().mockResolvedValue({
                gasUsed: { toString: () => '100000' }
            })
        };

        // Mock sequencer inbox with proper BigNumber return
        mockSequencerInbox = {
            call: jest.fn().mockResolvedValue({
                toNumber: () => 100
            })
        };

        // Mock contract for event queries
        mockContract = {
            filters: {
                SequencerBatchDelivered: jest.fn().mockReturnValue({})
            },
            queryFilter: jest.fn().mockResolvedValue([])
        };

        // Setup mocks
        OrbitChainConfig.findOne.mockResolvedValue(mockOrbitConfig);
        OrbitBatch.findOne.mockResolvedValue(null); // No existing batches
        ethers.providers.JsonRpcProvider.mockImplementation(() => mockParentProvider);
        ProductionRpcClient.mockImplementation(() => mockSequencerInbox);
        ethers.Contract.mockImplementation(() => mockContract);
        getOrbitConfig.mockReturnValue({
            BATCH_DISCOVERY_LIMIT: 1000
        });
    });

    describe('basic functionality', () => {
        it('should skip when no orbit config is found', async () => {
            OrbitChainConfig.findOne.mockResolvedValue(null);

            const result = await discoverOrbitBatches(mockJob);

            expect(result).toEqual({
                status: 'skipped',
                reason: 'no_orbit_config'
            });
        });

        it('should skip when no new batches to discover', async () => {
            // Mock that current batch count equals last indexed batch
            mockSequencerInbox.call.mockResolvedValue({
                toNumber: () => 50
            });
            OrbitBatch.findOne.mockResolvedValue({
                batchSequenceNumber: 49
            });

            const result = await discoverOrbitBatches(mockJob);

            expect(result).toEqual({
                status: 'completed',
                reason: 'no_new_batches',
                currentBatchNumber: 50,
                lastIndexedNumber: 49
            });
        });
    });

    describe('batch-by-batch discovery', () => {
        it('should discover new batches using batch-by-batch approach', async () => {
            // Mock that we have new batches to discover
            mockSequencerInbox.call.mockResolvedValue({
                toNumber: () => 100
            });
            OrbitBatch.findOne.mockResolvedValue({
                batchSequenceNumber: 95
            });

            // Mock finding a batch event
            const mockEvent = {
                args: {
                    batchSequenceNumber: {
                        toNumber: () => 96
                    },
                    beforeAcc: '0x1234',
                    afterAcc: '0x5678',
                    delayedAcc: '0x9abc',
                    afterDelayedMessagesRead: {
                        toString: () => '10'
                    },
                    timeBounds: {
                        minTimestamp: { toString: () => '1640995200' },
                        maxTimestamp: { toString: () => '1640995260' },
                        minBlockNumber: { toString: () => '1000' },
                        maxBlockNumber: { toString: () => '1100' }
                    },
                    dataLocation: 0,
                    data: '0x1234567890'
                },
                blockNumber: 19999999,
                transactionHash: '0xabcdef1234567890',
                transactionIndex: 0
            };

            mockContract.queryFilter.mockResolvedValue([mockEvent]);

            // Mock successful batch creation
            const mockCreatedBatch = {
                id: 1,
                batchSequenceNumber: 96,
                transactionCount: 5,
                batchSize: 1024
            };
            OrbitBatch.create.mockResolvedValue(mockCreatedBatch);

            const result = await discoverOrbitBatches(mockJob);

            expect(result.status).toBe('completed');
            expect(result.batchesIndexed).toBe(1);
            expect(result.batchesProcessed).toBe(4); // 96, 97, 98, 99 (limited by BATCH_DISCOVERY_LIMIT)
            expect(result.hasMoreBatches).toBe(true);

            // Verify that the batch was created with correct data
            expect(OrbitBatch.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    workspaceId: 1,
                    batchSequenceNumber: 96,
                    parentChainBlockNumber: 19999999,
                    parentChainTxHash: '0xabcdef1234567890',
                    discoveryMethod: 'batch-by-batch'
                })
            );
        });

        it('should handle missing batch events gracefully', async () => {
            // Mock that we have new batches to discover
            mockSequencerInbox.call.mockResolvedValue({
                toNumber: () => 100
            });
            OrbitBatch.findOne.mockResolvedValue({
                batchSequenceNumber: 95
            });

            // Mock that no events are found for some batches
            mockContract.queryFilter
                .mockResolvedValueOnce([]) // No event for batch 96
                .mockResolvedValueOnce([{ // Event found for batch 97
                    args: {
                        batchSequenceNumber: {
                            toNumber: () => 97
                        },
                        beforeAcc: '0x1234',
                        afterAcc: '0x5678',
                        delayedAcc: '0x9abc',
                        afterDelayedMessagesRead: {
                            toString: () => '10'
                        },
                        timeBounds: {
                            minTimestamp: { toString: () => '1640995200' },
                            maxTimestamp: { toString: () => '1640995260' },
                            minBlockNumber: { toString: () => '1000' },
                            maxBlockNumber: { toString: () => '1100' }
                        },
                        dataLocation: 0,
                        data: '0x1234567890'
                    },
                    blockNumber: 19999999,
                    transactionHash: '0xabcdef1234567890',
                    transactionIndex: 0
                }]);

            const mockCreatedBatch = {
                id: 1,
                batchSequenceNumber: 97,
                transactionCount: 5,
                batchSize: 1024
            };
            OrbitBatch.create.mockResolvedValue(mockCreatedBatch);

            const result = await discoverOrbitBatches(mockJob);

            expect(result.status).toBe('completed');
            expect(result.batchesIndexed).toBe(1);
            expect(result.errors).toBe(1); // One error for missing batch 96
            expect(result.batchesSkipped).toBe(0);
        });

        it('should skip existing batches', async () => {
            // Mock that we have new batches to discover
            mockSequencerInbox.call.mockResolvedValue({
                toNumber: () => 100
            });
            OrbitBatch.findOne.mockResolvedValue({
                batchSequenceNumber: 95
            });

            // Mock that batch 96 already exists
            OrbitBatch.findOne
                .mockResolvedValueOnce({ batchSequenceNumber: 95 }) // Last indexed batch
                .mockResolvedValueOnce({ batchSequenceNumber: 96 }) // Batch 96 exists
                .mockResolvedValueOnce(null); // Batch 97 doesn't exist

            // Mock finding a batch event for batch 97
            const mockEvent = {
                args: {
                    batchSequenceNumber: {
                        toNumber: () => 97
                    },
                    beforeAcc: '0x1234',
                    afterAcc: '0x5678',
                    delayedAcc: '0x9abc',
                    afterDelayedMessagesRead: {
                        toString: () => '10'
                    },
                    timeBounds: {
                        minTimestamp: { toString: () => '1640995200' },
                        maxTimestamp: { toString: () => '1640995260' },
                        minBlockNumber: { toString: () => '1000' },
                        maxBlockNumber: { toString: () => '1100' }
                    },
                    dataLocation: 0,
                    data: '0x1234567890'
                },
                blockNumber: 19999999,
                transactionHash: '0xabcdef1234567890',
                transactionIndex: 0
            };

            mockContract.queryFilter.mockResolvedValue([mockEvent]);

            const mockCreatedBatch = {
                id: 1,
                batchSequenceNumber: 97,
                transactionCount: 5,
                batchSize: 1024
            };
            OrbitBatch.create.mockResolvedValue(mockCreatedBatch);

            const result = await discoverOrbitBatches(mockJob);

            expect(result.status).toBe('completed');
            expect(result.batchesIndexed).toBe(1);
            expect(result.batchesSkipped).toBe(1); // Batch 96 was skipped
        });
    });

    describe('error handling', () => {
        it('should handle RPC errors gracefully', async () => {
            // Mock that we have new batches to discover
            mockSequencerInbox.call.mockResolvedValue({
                toNumber: () => 100
            });
            OrbitBatch.findOne.mockResolvedValue({
                batchSequenceNumber: 95
            });

            // Mock RPC error
            mockContract.queryFilter.mockRejectedValue(new Error('RPC timeout'));

            const result = await discoverOrbitBatches(mockJob);

            expect(result.status).toBe('completed');
            expect(result.errors).toBeGreaterThan(0);
            expect(result.errorDetails).toHaveLength(4); // 4 batches processed
        });

        it('should handle batch creation errors', async () => {
            // Mock that we have new batches to discover
            mockSequencerInbox.call.mockResolvedValue({
                toNumber: () => 100
            });
            OrbitBatch.findOne.mockResolvedValue({
                batchSequenceNumber: 95
            });

            // Mock finding a batch event
            const mockEvent = {
                args: {
                    batchSequenceNumber: {
                        toNumber: () => 96
                    },
                    beforeAcc: '0x1234',
                    afterAcc: '0x5678',
                    delayedAcc: '0x9abc',
                    afterDelayedMessagesRead: {
                        toString: () => '10'
                    },
                    timeBounds: {
                        minTimestamp: { toString: () => '1640995200' },
                        maxTimestamp: { toString: () => '1640995260' },
                        minBlockNumber: { toString: () => '1000' },
                        maxBlockNumber: { toString: () => '1100' }
                    },
                    dataLocation: 0,
                    data: '0x1234567890'
                },
                blockNumber: 19999999,
                transactionHash: '0xabcdef1234567890',
                transactionIndex: 0
            };

            mockContract.queryFilter.mockResolvedValue([mockEvent]);

            // Mock batch creation error
            OrbitBatch.create.mockRejectedValue(new Error('Database error'));

            const result = await discoverOrbitBatches(mockJob);

            expect(result.status).toBe('completed');
            expect(result.errors).toBe(1);
        });
    });
}); 
require('../mocks/lib/queue');
require('../mocks/lib/logger');
require('../mocks/models');

const { OrbitDeposit, OrbitChainConfig } = require('../mocks/models');
const { enqueue } = require('../../lib/queue');
const { ORBIT_BRIDGE_MESSAGE_DELIVERED_EVENT_ABI } = require('../../constants/orbit');
const backfillOrbitMessageDeliveredLogs = require('../../jobs/backfillOrbitMessageDeliveredLogs');

// Mock dependencies
jest.mock('../../lib/queue');
jest.mock('../../lib/logger');

beforeEach(() => jest.clearAllMocks());

describe('backfillOrbitMessageDeliveredLogs', () => {
    let mockJob;
    let mockOrbitConfig;
    let mockParentWorkspace;
    let mockViemClient;
    let mockFilter;
    let mockLogs;

    beforeEach(() => {
        // Reset mocks
        jest.clearAllMocks();

        // Mock job data
        mockJob = {
            id: 'test-job-id',
            data: { 
                orbitChainConfigId: 1,
                fromBlock: 1000
            }
        };

        // Mock orbit config
        mockOrbitConfig = {
            id: 1,
            workspaceId: 1,
            bridgeContract: '0x1234567890123456789012345678901234567890'
        };

        // Mock parent workspace
        mockParentWorkspace = {
            getViemPublicClient: jest.fn()
        };

        // Mock viem client
        mockViemClient = {
            createEventFilter: jest.fn(),
            getFilterLogs: jest.fn()
        };

        // Mock filter
        mockFilter = {
            id: 'filter-123'
        };

        // Mock logs
        mockLogs = [
            {
                args: {
                    kind: 3,
                    messageIndex: '100',
                    timestamp: '1640995200',
                    sender: '0x1234567890123456789012345678901234567890'
                },
                blockNumber: '0x3e8',
                transactionHash: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890'
            },
            {
                args: {
                    kind: 7,
                    messageIndex: '101',
                    timestamp: '1640995201',
                    sender: '0x2345678901234567890123456789012345678901'
                },
                blockNumber: '0x3e9',
                transactionHash: '0xbcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890ab'
            },
            {
                args: {
                    kind: 5, // Not in allowed kinds
                    messageIndex: '102',
                    timestamp: '1640995202',
                    sender: '0x3456789012345678901234567890123456789012'
                },
                blockNumber: '0x3ea',
                transactionHash: '0xcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcd'
            }
        ];

        // Setup mocks
        OrbitChainConfig.findByPk.mockResolvedValue(mockOrbitConfig);
        mockOrbitConfig.getParentWorkspace = jest.fn().mockResolvedValue(mockParentWorkspace);
        mockParentWorkspace.getViemPublicClient.mockReturnValue(mockViemClient);
        mockViemClient.createEventFilter.mockResolvedValue(mockFilter);
        mockViemClient.getFilterLogs.mockResolvedValue(mockLogs);
        OrbitDeposit.bulkCreate.mockResolvedValue([]);
        enqueue.mockResolvedValue(true);
    });

    describe('basic functionality', () => {
        it('should process job with provided fromBlock', async () => {
            const result = await backfillOrbitMessageDeliveredLogs(mockJob);

            expect(OrbitChainConfig.findByPk).toHaveBeenCalledWith(1);
            expect(mockOrbitConfig.getParentWorkspace).toHaveBeenCalled();
            expect(mockParentWorkspace.getViemPublicClient).toHaveBeenCalled();
            
            // Check filter creation with correct block range
            expect(mockViemClient.createEventFilter).toHaveBeenCalledWith({
                address: mockOrbitConfig.bridgeContract,
                event: ORBIT_BRIDGE_MESSAGE_DELIVERED_EVENT_ABI,
                fromBlock: '0x3e3', // 995 in hex (1000 - 5)
                toBlock: '0x3e8'    // 1000 in hex
            });

            expect(mockViemClient.getFilterLogs).toHaveBeenCalledWith({ filter: mockFilter });
            
            // Check bulkCreate call with all deposits at once
            expect(OrbitDeposit.bulkCreate).toHaveBeenCalledTimes(1);
            
            expect(OrbitDeposit.bulkCreate).toHaveBeenCalledWith([
                {
                    workspaceId: 1,
                    l1Block: 1000,
                    l1TransactionHash: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
                    messageIndex: 100,
                    timestamp: '1640995200',
                    sender: '0x1234567890123456789012345678901234567890'
                },
                {
                    workspaceId: 1,
                    l1Block: 1001,
                    l1TransactionHash: '0xbcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890ab',
                    messageIndex: 101,
                    timestamp: '1640995201',
                    sender: '0x2345678901234567890123456789012345678901'
                }
            ], { ignoreDuplicates: true });

            // Check enqueue for next iteration
            expect(enqueue).toHaveBeenCalledWith(
                'backfillOrbitMessageDeliveredLogs',
                'backfillOrbitMessageDeliveredLogs-1-995-990',
                {
                    orbitChainConfigId: 1,
                    fromBlock: 995
                }
            );

            expect(result).toBe(true);
        });

        it('should determine fromBlock from earliest deposit when not provided', async () => {
            mockJob.data.fromBlock = null;
            
            const mockEarliestDeposit = {
                l1Block: 500
            };
            
            OrbitDeposit.findAll.mockResolvedValue([mockEarliestDeposit]);

            await backfillOrbitMessageDeliveredLogs(mockJob);

            expect(OrbitDeposit.findAll).toHaveBeenCalledWith({
                where: { workspaceId: 1 },
                order: [['messageIndex', 'ASC']],
                limit: 1
            });

            // Should use earliest deposit block (500) as fromBlock
            expect(mockViemClient.createEventFilter).toHaveBeenCalledWith({
                address: mockOrbitConfig.bridgeContract,
                event: ORBIT_BRIDGE_MESSAGE_DELIVERED_EVENT_ABI,
                fromBlock: '0x1ef', // 495 in hex (500 - 5)
                toBlock: '0x1f4'    // 500 in hex
            });
        });

        it('should throw error when fromBlock cannot be determined', async () => {
            mockJob.data.fromBlock = null;
            OrbitDeposit.findAll.mockResolvedValue([]);

            await expect(backfillOrbitMessageDeliveredLogs(mockJob))
                .rejects.toThrow('Cannot read properties of undefined');
        });

        it('should only process logs with allowed kinds (3, 7, 9, 12)', async () => {
            // Add more logs with different kinds
            const extendedLogs = [
                ...mockLogs,
                {
                    args: {
                        kind: 9,
                        messageIndex: '103',
                        timestamp: '1640995203',
                        sender: '0x4567890123456789012345678901234567890123'
                    },
                    blockNumber: '0x3eb',
                    transactionHash: '0xdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcd'
                },
                {
                    args: {
                        kind: 12,
                        messageIndex: '104',
                        timestamp: '1640995204',
                        sender: '0x5678901234567890123456789012345678901234'
                    },
                    blockNumber: '0x3ec',
                    transactionHash: '0xef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcde'
                },
                {
                    args: {
                        kind: 2, // Not allowed
                        messageIndex: '105',
                        timestamp: '1640995205',
                        sender: '0x6789012345678901234567890123456789012345'
                    },
                    blockNumber: '0x3ed',
                    transactionHash: '0xf1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef'
                }
            ];

            mockViemClient.getFilterLogs.mockResolvedValue(extendedLogs);

            await backfillOrbitMessageDeliveredLogs(mockJob);

            // Should create all deposits in a single bulkCreate call
            expect(OrbitDeposit.bulkCreate).toHaveBeenCalledTimes(1);
            
            expect(OrbitDeposit.bulkCreate).toHaveBeenCalledWith([
                {
                    workspaceId: 1,
                    l1Block: 1000,
                    l1TransactionHash: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
                    messageIndex: 100,
                    timestamp: '1640995200',
                    sender: '0x1234567890123456789012345678901234567890'
                },
                {
                    workspaceId: 1,
                    l1Block: 1001,
                    l1TransactionHash: '0xbcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890ab',
                    messageIndex: 101,
                    timestamp: '1640995201',
                    sender: '0x2345678901234567890123456789012345678901'
                },
                {
                    workspaceId: 1,
                    l1Block: 1003,
                    l1TransactionHash: '0xdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcd',
                    messageIndex: 103,
                    timestamp: '1640995203',
                    sender: '0x4567890123456789012345678901234567890123'
                },
                {
                    workspaceId: 1,
                    l1Block: 1004,
                    l1TransactionHash: '0xef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcde',
                    messageIndex: 104,
                    timestamp: '1640995204',
                    sender: '0x5678901234567890123456789012345678901234'
                }
            ], { ignoreDuplicates: true });
        });
    });

    describe('block range calculations', () => {
        it('should calculate correct block range with SCAN_RANGE = 5', async () => {
            mockJob.data.fromBlock = 1000;

            await backfillOrbitMessageDeliveredLogs(mockJob);

            // fromBlock should be 1000 - 5 = 995
            // toBlock should be 1000
            expect(mockViemClient.createEventFilter).toHaveBeenCalledWith({
                address: mockOrbitConfig.bridgeContract,
                event: ORBIT_BRIDGE_MESSAGE_DELIVERED_EVENT_ABI,
                fromBlock: '0x3e3', // 995 in hex
                toBlock: '0x3e8'    // 1000 in hex
            });
        });

        it('should handle large block numbers correctly', async () => {
            mockJob.data.fromBlock = 1000000;

            await backfillOrbitMessageDeliveredLogs(mockJob);

            expect(mockViemClient.createEventFilter).toHaveBeenCalledWith({
                address: mockOrbitConfig.bridgeContract,
                event: ORBIT_BRIDGE_MESSAGE_DELIVERED_EVENT_ABI,
                fromBlock: '0xf423b', // 999995 in hex
                toBlock: '0xf4240'    // 1000000 in hex
            });
        });
    });

    describe('enqueue next iteration', () => {
        it('should enqueue next job with correct parameters', async () => {
            mockJob.data.fromBlock = 1000;

            await backfillOrbitMessageDeliveredLogs(mockJob);

            expect(enqueue).toHaveBeenCalledWith(
                'backfillOrbitMessageDeliveredLogs',
                'backfillOrbitMessageDeliveredLogs-1-995-990',
                {
                    orbitChainConfigId: 1,
                    fromBlock: 995
                }
            );
        });

        it('should generate unique job name with block range', async () => {
            mockJob.data.fromBlock = 500;

            await backfillOrbitMessageDeliveredLogs(mockJob);

            expect(enqueue).toHaveBeenCalledWith(
                'backfillOrbitMessageDeliveredLogs',
                'backfillOrbitMessageDeliveredLogs-1-495-490',
                {
                    orbitChainConfigId: 1,
                    fromBlock: 495
                }
            );
        });
    });

    describe('error handling', () => {
        it('should handle missing orbit config', async () => {
            OrbitChainConfig.findByPk.mockResolvedValue(null);

            await expect(backfillOrbitMessageDeliveredLogs(mockJob))
                .rejects.toThrow('OrbitChainConfig not found');
        });

        it('should handle undefined orbit config', async () => {
            OrbitChainConfig.findByPk.mockResolvedValue(undefined);

            await expect(backfillOrbitMessageDeliveredLogs(mockJob))
                .rejects.toThrow('OrbitChainConfig not found');
        });

        it('should handle missing parent workspace', async () => {
            mockOrbitConfig.getParentWorkspace.mockResolvedValue(null);

            await expect(backfillOrbitMessageDeliveredLogs(mockJob))
                .rejects.toThrow();
        });

        it('should handle viem client errors', async () => {
            mockViemClient.createEventFilter.mockRejectedValue(new Error('Viem error'));

            await expect(backfillOrbitMessageDeliveredLogs(mockJob))
                .rejects.toThrow('Viem error');
        });

        it('should handle getFilterLogs errors', async () => {
            mockViemClient.getFilterLogs.mockRejectedValue(new Error('Filter logs error'));

            await expect(backfillOrbitMessageDeliveredLogs(mockJob))
                .rejects.toThrow('Filter logs error');
        });
    });

    describe('data processing', () => {
        it('should parse log data correctly', async () => {
            const logWithLargeNumbers = {
                args: {
                    kind: 3,
                    messageIndex: '999999999',
                    timestamp: '9999999999',
                    sender: '0x1234567890123456789012345678901234567890'
                },
                blockNumber: '0x3e8',
                transactionHash: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890'
            };

            mockViemClient.getFilterLogs.mockResolvedValue([logWithLargeNumbers]);

            await backfillOrbitMessageDeliveredLogs(mockJob);

            expect(OrbitDeposit.bulkCreate).toHaveBeenCalledWith([
                {
                    workspaceId: 1,
                    l1Block: 1000,
                    l1TransactionHash: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
                    messageIndex: 999999999,
                    timestamp: '9999999999',
                    sender: '0x1234567890123456789012345678901234567890'
                }
            ], { ignoreDuplicates: true });
        });

        it('should handle empty logs array', async () => {
            mockViemClient.getFilterLogs.mockResolvedValue([]);

            await backfillOrbitMessageDeliveredLogs(mockJob);

            // With empty logs, bulkCreate should be called with empty array
            expect(OrbitDeposit.bulkCreate).toHaveBeenCalledWith([], { ignoreDuplicates: true });
            expect(enqueue).toHaveBeenCalledWith(
                'backfillOrbitMessageDeliveredLogs',
                'backfillOrbitMessageDeliveredLogs-1-995-990',
                {
                    orbitChainConfigId: 1,
                    fromBlock: 995
                }
            );
        });
    });

    describe('edge cases', () => {
        it('should handle fromBlock = 0', async () => {
            // When fromBlock is 0, it's falsy so the job will try to find earliest deposit
            mockJob.data.fromBlock = 0;
            
            const mockEarliestDeposit = {
                l1Block: 100
            };
            
            OrbitDeposit.findAll.mockResolvedValue([mockEarliestDeposit]);

            await backfillOrbitMessageDeliveredLogs(mockJob);

            expect(mockViemClient.createEventFilter).toHaveBeenCalledWith({
                address: mockOrbitConfig.bridgeContract,
                event: ORBIT_BRIDGE_MESSAGE_DELIVERED_EVENT_ABI,
                fromBlock: '0x5f', // 95 in hex (100 - 5)
                toBlock: '0x64'    // 100 in hex
            });
        });
    });
});

const OrbitTransactionProcessor = require('../../lib/orbitTransactionProcessor');
const { OrbitTransactionState, OrbitChainConfig, Workspace, Transaction } = require('../../models');
const { ProductionRpcClient, BatchDataParser } = require('../../lib/orbitRetry');

// Mock dependencies
jest.mock('../../lib/orbitRetry');
jest.mock('../../lib/orbitConfig');
jest.mock('../../lib/logger');

describe('OrbitTransactionProcessor', () => {
    let processor;
    let mockTransaction;
    let mockWorkspace;
    let mockOrbitConfig;
    let mockProvider;

    beforeEach(() => {
        // Create mock objects
        mockProvider = {
            getCode: jest.fn(),
            getBlock: jest.fn(),
            getBlockNumber: jest.fn()
        };

        mockOrbitConfig = {
            rollupContract: '0x1234567890123456789012345678901234567890',
            bridgeContract: '0x2345678901234567890123456789012345678901',
            sequencerInboxContract: '0x3456789012345678901234567890123456789012',
            inboxContract: '0x4567890123456789012345678901234567890123',
            outboxContract: '0x5678901234567890123456789012345678901234',
            chainType: 'Rollup',
            parentChainId: 1
        };

        mockWorkspace = {
            id: 1,
            name: 'test-workspace',
            orbitConfig: mockOrbitConfig,
            getProvider: jest.fn().mockReturnValue(mockProvider)
        };

        mockTransaction = {
            id: 1,
            hash: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
            workspace: mockWorkspace,
            blockNumber: 100
        };

        // Mock the config module
        require('../../lib/orbitConfig').getOrbitConfig.mockReturnValue({
            SEQUENCING_TIMEOUT: 600000,
            POSTING_TIMEOUT: 3600000,
            CONFIRMATION_TIMEOUT: 604800000,
            FINALIZATION_TIMEOUT: 604800000,
            getRetryConfig: jest.fn().mockReturnValue({
                attempts: 3,
                delay: 1000,
                maxDelay: 10000,
                backoff: 'exponential'
            }),
            getCircuitBreakerConfig: jest.fn().mockReturnValue({
                failureThreshold: 5,
                resetTimeout: 60000,
                monitorTimeout: 30000
            })
        });

        processor = new OrbitTransactionProcessor(mockTransaction);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('constructor', () => {
        it('should initialize processor with correct properties', () => {
            expect(processor.transaction).toBe(mockTransaction);
            expect(processor.workspace).toBe(mockWorkspace);
            expect(processor.orbitConfig).toBe(mockOrbitConfig);
            expect(processor.provider).toBe(mockProvider);
            expect(processor.context).toEqual({
                transactionId: mockTransaction.id,
                transactionHash: mockTransaction.hash,
                workspaceId: mockWorkspace.id,
                chainType: mockOrbitConfig.chainType
            });
        });

        it('should initialize metrics tracking', () => {
            expect(processor.metrics).toEqual({
                startTime: expect.any(Number),
                stateTransitions: 0,
                rpcCalls: 0,
                errors: 0
            });
        });
    });

    describe('process', () => {
        let mockOrbitState;

        beforeEach(() => {
            mockOrbitState = {
                currentState: 'SUBMITTED',
                submittedAt: new Date(),
                updateState: jest.fn(),
                markAsFailed: jest.fn()
            };

            processor.createInitialState = jest.fn().mockResolvedValue(mockOrbitState);
            processor.processStateTransition = jest.fn().mockResolvedValue();
            processor.validateContracts = jest.fn().mockResolvedValue(true);
        });

        it('should process transaction successfully', async () => {
            await processor.process();

            expect(processor.validateContracts).toHaveBeenCalled();
            expect(processor.createInitialState).toHaveBeenCalled();
            expect(processor.processStateTransition).toHaveBeenCalledWith(mockOrbitState);
        });

        it('should handle contract validation failure', async () => {
            const error = new Error('Contract validation failed');
            processor.validateContracts.mockRejectedValue(error);

            await expect(processor.process()).rejects.toThrow('Contract validation failed');
        });

        it('should handle processing errors gracefully', async () => {
            const error = new Error('Processing failed');
            processor.processStateTransition.mockRejectedValue(error);

            await expect(processor.process()).rejects.toThrow('Processing failed');
            expect(processor.metrics.errors).toBe(1);
        });
    });

    describe('checkSequenced', () => {
        let mockOrbitState;
        let mockSequencerInbox;

        beforeEach(() => {
            mockOrbitState = {
                currentState: 'SUBMITTED',
                submittedBlockNumber: 95,
                submittedAt: new Date(Date.now() - 60000), // 1 minute ago
                updateState: jest.fn(),
                setStateDetails: jest.fn(),
                markAsFailed: jest.fn()
            };

            mockSequencerInbox = {
                call: jest.fn(),
                contractAddress: mockOrbitConfig.sequencerInboxContract,
                abi: [],
                provider: mockProvider
            };

            processor.getSequencerInboxContract = jest.fn().mockResolvedValue(mockSequencerInbox);
            processor.queryEvents = jest.fn().mockResolvedValue([]);
            processor.checkTransactionInBatch = jest.fn().mockResolvedValue(false);
        });

        it('should handle no events found', async () => {
            mockSequencerInbox.call.mockResolvedValue(5);
            processor.queryEvents.mockResolvedValue([]);

            await processor.checkSequenced(mockOrbitState);

            expect(mockOrbitState.updateState).not.toHaveBeenCalled();
            expect(mockOrbitState.markAsFailed).not.toHaveBeenCalled();
        });

        it('should find transaction in batch and update state', async () => {
            const mockEvent = {
                args: {
                    batchSequenceNumber: 3,
                    afterAcc: '0xabc123'
                },
                blockNumber: 105,
                transactionHash: '0xevent123'
            };

            mockSequencerInbox.call.mockResolvedValue(5);
            processor.queryEvents.mockResolvedValue([mockEvent]);
            processor.checkTransactionInBatch.mockResolvedValue(true);

            await processor.checkSequenced(mockOrbitState);

            expect(processor.checkTransactionInBatch).toHaveBeenCalledWith(
                mockEvent.args.batchSequenceNumber,
                mockTransaction.hash
            );
            expect(mockOrbitState.updateState).toHaveBeenCalledWith('SEQUENCED', {
                sequenced: {
                    batchSequenceNumber: '3',
                    afterAcc: '0xabc123',
                    blockNumber: 105,
                    transactionHash: '0xevent123',
                    verifiedAt: expect.any(String)
                }
            });
            expect(mockOrbitState.setStateDetails).toHaveBeenCalledWith('SEQUENCED', 105);
        });

        it('should mark as failed if sequencing timeout exceeded', async () => {
            // Set submitted time to more than timeout ago
            mockOrbitState.submittedAt = new Date(Date.now() - 700000); // 11+ minutes ago
            
            mockSequencerInbox.call.mockResolvedValue(5);
            processor.queryEvents.mockResolvedValue([]);

            await processor.checkSequenced(mockOrbitState);

            expect(mockOrbitState.markAsFailed).toHaveBeenCalledWith(
                expect.stringContaining('Transaction not sequenced within timeout')
            );
        });

        it('should handle RPC errors gracefully', async () => {
            const error = new Error('RPC connection failed');
            mockSequencerInbox.call.mockRejectedValue(error);

            await processor.checkSequenced(mockOrbitState);

            expect(mockOrbitState.markAsFailed).toHaveBeenCalledWith(
                'Failed to check sequenced state: RPC connection failed'
            );
        });

        it('should not fail on circuit breaker errors', async () => {
            const error = new Error('Circuit breaker is OPEN');
            mockSequencerInbox.call.mockRejectedValue(error);

            await processor.checkSequenced(mockOrbitState);

            expect(mockOrbitState.markAsFailed).not.toHaveBeenCalled();
        });
    });

    describe('checkTransactionInBatch', () => {
        beforeEach(() => {
            processor.getBatchData = jest.fn().mockResolvedValue(Buffer.from('batch-data'));
            processor.batchParser = {
                parseBatchData: jest.fn().mockResolvedValue({ isIncluded: true })
            };
        });

        it('should return true when transaction is included in batch', async () => {
            const result = await processor.checkTransactionInBatch(5, mockTransaction.hash);

            expect(processor.getBatchData).toHaveBeenCalledWith(5);
            expect(processor.batchParser.parseBatchData).toHaveBeenCalledWith(
                expect.any(Buffer),
                mockTransaction.hash
            );
            expect(result).toBe(true);
        });

        it('should return false when transaction is not included', async () => {
            processor.batchParser.parseBatchData.mockResolvedValue({ isIncluded: false });

            const result = await processor.checkTransactionInBatch(5, mockTransaction.hash);

            expect(result).toBe(false);
        });

        it('should handle batch parsing errors', async () => {
            const error = new Error('Batch parsing failed');
            processor.batchParser.parseBatchData.mockRejectedValue(error);

            await expect(processor.checkTransactionInBatch(5, mockTransaction.hash))
                .rejects.toThrow('Batch parsing failed');
        });
    });

    describe('validateContracts', () => {
        let mockContracts;

        beforeEach(() => {
            mockContracts = {
                sequencerInbox: {
                    call: jest.fn().mockResolvedValue(5),
                    healthCheck: jest.fn().mockResolvedValue({ healthy: true, contractDeployed: true })
                },
                rollup: {
                    call: jest.fn().mockResolvedValue(10),
                    healthCheck: jest.fn().mockResolvedValue({ healthy: true, contractDeployed: true })
                },
                bridge: {
                    call: jest.fn().mockResolvedValue(true),
                    healthCheck: jest.fn().mockResolvedValue({ healthy: true, contractDeployed: true })
                }
            };

            processor.getSequencerInboxContract = jest.fn().mockResolvedValue(mockContracts.sequencerInbox);
            processor.getRollupContract = jest.fn().mockResolvedValue(mockContracts.rollup);
            processor.getBridgeContract = jest.fn().mockResolvedValue(mockContracts.bridge);
        });

        it('should validate all contracts successfully', async () => {
            const result = await processor.validateContracts();

            expect(result).toBe(true);
            expect(mockContracts.sequencerInbox.call).toHaveBeenCalledWith('batchCount');
            expect(mockContracts.rollup.call).toHaveBeenCalledWith('latestConfirmed');
            expect(mockContracts.sequencerInbox.healthCheck).toHaveBeenCalled();
            expect(mockContracts.rollup.healthCheck).toHaveBeenCalled();
            expect(mockContracts.bridge.healthCheck).toHaveBeenCalled();
        });

        it('should fail validation when contracts are unhealthy', async () => {
            mockContracts.sequencerInbox.healthCheck.mockResolvedValue({
                healthy: false,
                error: 'Contract not deployed'
            });

            await expect(processor.validateContracts()).rejects.toThrow(
                'Contract validation failed: Some contracts are unhealthy'
            );
        });

        it('should handle contract call failures', async () => {
            const error = new Error('Contract call failed');
            mockContracts.sequencerInbox.call.mockRejectedValue(error);

            await expect(processor.validateContracts()).rejects.toThrow(
                'Contract validation failed: Contract call failed'
            );
        });
    });

    describe('queryEvents', () => {
        let mockContract;
        let mockEthersContract;

        beforeEach(() => {
            mockContract = {
                contractAddress: '0x1234',
                abi: ['event TestEvent()'],
                provider: mockProvider
            };

            mockEthersContract = {
                filters: {
                    TestEvent: jest.fn().mockReturnValue('filter'),
                },
                queryFilter: jest.fn().mockResolvedValue([
                    { blockNumber: 100, transactionHash: '0xabc' }
                ])
            };

            // Mock ethers Contract constructor
            const { ethers } = require('ethers');
            ethers.Contract = jest.fn().mockReturnValue(mockEthersContract);
        });

        it('should query events successfully', async () => {
            const events = await processor.queryEvents(mockContract, 'TestEvent', 95, 105);

            expect(events).toHaveLength(1);
            expect(events[0]).toEqual({
                blockNumber: 100,
                transactionHash: '0xabc'
            });
            expect(mockEthersContract.queryFilter).toHaveBeenCalledWith('filter', 95, 105);
        });

        it('should handle event query failures', async () => {
            const error = new Error('Event query failed');
            mockEthersContract.queryFilter.mockRejectedValue(error);

            await expect(processor.queryEvents(mockContract, 'TestEvent', 95, 105))
                .rejects.toThrow('Event query failed');
        });
    });

    describe('contract getters', () => {
        it('should create and cache sequencer inbox contract', async () => {
            const contract1 = await processor.getSequencerInboxContract();
            const contract2 = await processor.getSequencerInboxContract();

            expect(contract1).toBe(contract2); // Should be cached
            expect(ProductionRpcClient).toHaveBeenCalledWith(
                mockProvider,
                mockOrbitConfig.sequencerInboxContract,
                expect.any(Array),
                'SequencerInbox'
            );
        });

        it('should create and cache rollup contract', async () => {
            const contract1 = await processor.getRollupContract();
            const contract2 = await processor.getRollupContract();

            expect(contract1).toBe(contract2);
            expect(ProductionRpcClient).toHaveBeenCalledWith(
                mockProvider,
                mockOrbitConfig.rollupContract,
                expect.any(Array),
                'Rollup'
            );
        });

        it('should create and cache bridge contract', async () => {
            const contract1 = await processor.getBridgeContract();
            const contract2 = await processor.getBridgeContract();

            expect(contract1).toBe(contract2);
            expect(ProductionRpcClient).toHaveBeenCalledWith(
                mockProvider,
                mockOrbitConfig.bridgeContract,
                expect.any(Array),
                'Bridge'
            );
        });
    });

    describe('getContractAddresses', () => {
        it('should return correct contract addresses', () => {
            const addresses = processor.getContractAddresses();

            expect(addresses).toEqual({
                rollup: mockOrbitConfig.rollupContract,
                bridge: mockOrbitConfig.bridgeContract,
                sequencerInbox: mockOrbitConfig.sequencerInboxContract,
                inbox: mockOrbitConfig.inboxContract,
                outbox: mockOrbitConfig.outboxContract
            });
        });
    });
});
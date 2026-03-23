require('../mocks/lib/rateLimiter');
require('../mocks/lib/rpc');
require('../mocks/lib/queue');
require('../mocks/lib/firebase');
require('../mocks/lib/transactions');
require('../mocks/lib/logger');
const { Workspace, OrbitChainConfig, OpChainConfig } = require('../mocks/models');

const db = require('../../lib/firebase');
const { enqueue, bulkEnqueue } = require('../../lib/queue');
const { ProviderConnector } = require('../../lib/rpc');

const blockSync = require('../../jobs/blockSync');
const hasReachedTransactionQuota = jest.fn().mockResolvedValue(false);

beforeEach(() => {
    jest.clearAllMocks();
    // Mock OrbitChainConfig.findAll for all tests
    jest.spyOn(OrbitChainConfig, 'findAll').mockResolvedValue([]);
    // Mock OpChainConfig.findAll for all tests
    jest.spyOn(OpChainConfig, 'findAll').mockResolvedValue([]);
});

describe('blockSync', () => {
    const mockSafeCreatePartialBlock = jest.fn();
    const mockWorkspace = {
        id: 1,
        rpcServer: 'http://localhost:8545',
        public: true,
        rateLimitInterval: 1000,
        rateLimitMaxInInterval: 10,
        rpcHealthCheck: {
            isReachable: true
        },
        explorer: {
            hasReachedTransactionQuota,
            stripeSubscription: {},
            shouldSync: true
        },
        safeCreatePartialBlock: mockSafeCreatePartialBlock
    };

    jest.spyOn(Workspace, 'findByPk').mockResolvedValue(mockWorkspace);

    it('Should fetch receipts inline for small blocks (<=10 transactions)', (done) => {
        const safeCreateReceipt = jest.fn().mockResolvedValue();
        mockSafeCreatePartialBlock.mockResolvedValue({ transactions: [
            { id: 1, hash: '0x123', safeCreateReceipt },
            { id: 2, hash: '0x456', safeCreateReceipt }
        ]});

        blockSync({ opts: { priority: 1 }, data : { workspaceId: 1, userId: '123', workspace: 'My Workspace', blockNumber: 1 }})
            .then(res => {
                // Should NOT queue jobs for small blocks
                expect(bulkEnqueue).not.toHaveBeenCalled();
                // Should call safeCreateReceipt inline
                expect(safeCreateReceipt).toHaveBeenCalledTimes(2);
                expect(res).toEqual('Block synced');
                done();
            });
    });

    it('Should queue receipt processing with cached workspace for large blocks (>10 transactions)', (done) => {
        // Create 11 transactions to exceed threshold
        const transactions = [];
        for (let i = 0; i < 11; i++) {
            transactions.push({ id: i + 1, hash: `0x${i.toString(16).padStart(3, '0')}` });
        }
        mockSafeCreatePartialBlock.mockResolvedValue({ transactions });

        jest.spyOn(Workspace, 'findByPk').mockResolvedValueOnce({
            id: 1,
            rpcServer: 'http://localhost:8545',
            rateLimitInterval: 1000,
            rateLimitMaxInInterval: 10,
            public: true,
            rpcHealthCheck: {
                isReachable: true
            },
            explorer: {
                stripeSubscription: {},
                shouldSync: true
            },
            safeCreatePartialBlock: mockSafeCreatePartialBlock
        });

        blockSync({ opts: { priority: 1 }, data : { workspaceId: 1, userId: '123', workspace: 'My Workspace', blockNumber: 1 }})
            .then(res => {
                expect(bulkEnqueue).toHaveBeenCalledWith('receiptSync', expect.arrayContaining([
                    expect.objectContaining({
                        name: 'receiptSync-1-0x000',
                        data: expect.objectContaining({
                            transactionId: 1,
                            transactionHash: '0x000',
                            workspaceId: 1,
                            cachedWorkspace: {
                                rpcServer: 'http://localhost:8545',
                                rateLimitInterval: 1000,
                                rateLimitMaxInInterval: 10,
                                public: true
                            }
                        })
                    })
                ]), 1);
                expect(res).toEqual('Block synced');
                done();
            });
    });

    it('Should not cache workspace for orbit workspaces', (done) => {
        // Create 11 transactions to exceed threshold
        const transactions = [];
        for (let i = 0; i < 11; i++) {
            transactions.push({ id: i + 1, hash: `0x${i.toString(16).padStart(3, '0')}` });
        }
        mockSafeCreatePartialBlock.mockResolvedValue({ transactions });

        // Mock initial workspace query (without L2 configs)
        const mockWorkspace = {
            id: 1,
            rpcServer: 'http://localhost:8545',
            public: true,
            rpcHealthCheck: {
                isReachable: true
            },
            explorer: {
                stripeSubscription: {},
                shouldSync: true
            },
            safeCreatePartialBlock: mockSafeCreatePartialBlock
        };

        // Mock L2 configs query response with orbit config
        const mockL2Configs = {
            id: 1,
            orbitConfig: { rollupContract: '0x123' }, // Has orbit config
            orbitChildConfigs: [],
            opChildConfigs: []
        };

        jest.spyOn(Workspace, 'findByPk')
            .mockResolvedValueOnce(mockWorkspace)    // First call: lightweight query
            .mockResolvedValueOnce(mockL2Configs);   // Second call: L2 configs with orbit config

        blockSync({ opts: { priority: 1 }, data : { workspaceId: 1, userId: '123', workspace: 'My Workspace', blockNumber: 1 }})
            .then(res => {
                expect(bulkEnqueue).toHaveBeenCalledWith('receiptSync', expect.arrayContaining([
                    expect.objectContaining({
                        data: expect.not.objectContaining({
                            cachedWorkspace: expect.anything()
                        })
                    })
                ]), 1);
                expect(res).toEqual('Block synced');
                done();
            });
    });

    it('Should re-enqueue if timed out', (done) => {
        jest.spyOn(Date, 'now').mockImplementation(() => 1609459200000);
        jest.spyOn(Workspace, 'findByPk').mockResolvedValueOnce({
            id: 1,
            name: 'ws',
            user: { firebaseUserId: 'abc' },
            rpcServer: 'http://localhost:8545',
            rpcHealthCheck: {
                isReachable: true
            },
            explorer: {
                hasReachedTransactionQuota,
                stripeSubscription: {},
                shouldSync: true
            },
        });
        ProviderConnector.mockImplementationOnce(() => ({
            fetchRawBlockWithTransactions: jest.fn().mockRejectedValueOnce({ message: 'Timed out after 10000ms' })
        }));

        blockSync({ opts: { priority: 1 }, data : { source: 'cli-light', workspaceId: 1, userId: '123', workspace: 'My Workspace', blockNumber: 1 }})
            .then(() => {
                expect(enqueue).toHaveBeenCalledWith('blockSync', 'blockSync-1-1-1609459200000', {
                    workspaceId: 1,
                    blockNumber: 1,
                    source: 'cli-light',
                    rateLimited: false
                }, 1, null, 5000, false);
                done();
            });
    });

    it('Should re-enqueue if rate limited', (done) => {
        jest.spyOn(Date, 'now').mockImplementation(() => 1609459200000);
        jest.spyOn(Workspace, 'findByPk').mockResolvedValueOnce({
            id: 1,
            name: 'ws',
            user: { firebaseUserId: 'abc' },
            rpcServer: 'http://localhost:8545',
            rpcHealthCheck: {
                isReachable: true
            },
            explorer: {
                hasReachedTransactionQuota,
                stripeSubscription: {},
                shouldSync: true
            },
            rateLimitInterval: 5000,
            rateLimitMaxInInterval: 25,
        });
        ProviderConnector.mockImplementationOnce(() => ({
            fetchRawBlockWithTransactions: jest.fn().mockRejectedValueOnce({ message: 'Rate limited' })
        }));

        blockSync({ opts: { priority: 1 }, data : { source: 'cli-light', rateLimited: true, workspaceId: 1, userId: '123', workspace: 'My Workspace', blockNumber: 1 }})
            .then(() => {
                expect(enqueue).toHaveBeenCalledWith('blockSync', 'blockSync-1-1-1609459200000', {
                    workspaceId: 1,
                    blockNumber: 1,
                    source: 'cli-light',
                    rateLimited: true
                }, 1, null, 5000, true);
                done();
            });
    });

    it.skip('Should return if transaction quota reached', (done) => {
        jest.spyOn(Workspace, 'findByPk').mockResolvedValueOnce({
            id: 1,
            rpcServer: 'http://localhost:8545',
            rpcHealthCheck: {
                isReachable: true
            },
            explorer: {
                hasReachedTransactionQuota: jest.fn().mockResolvedValue(true),
                stripeSubscription: {},
                shouldSync: true
            }
        });
        blockSync({ opts: { priority: 1 }, data : { workspaceId: 1, userId: '123', workspace: 'My Workspace', blockNumber: 1 }})
            .then(res => {
                expect(res).toEqual('Transaction quota reached');
                done();
            });
    });

    it('Should return if no active explorer', (done) => {
        jest.spyOn(Workspace, 'findByPk').mockResolvedValueOnce({
            id: 1,
            rpcServer: 'http://localhost:8545',
            rpcHealthCheck: {
                isReachable: true
            },
            explorer: null
        });
        blockSync({ opts: { priority: 1 }, data : { workspaceId: 1, userId: '123', workspace: 'My Workspace', blockNumber: 1 }})
            .then(res => {
                expect(res).toEqual('No active explorer for this workspace');
                done();
            });
    });

    it('Should return if sync is disabled', (done) => {
        jest.spyOn(Workspace, 'findByPk').mockResolvedValueOnce({
            id: 1,
            rpcServer: 'http://localhost:8545',
            rpcHealthCheck: {
                isReachable: true
            },
            explorer: {
                shouldSync: false
            }
        });
        blockSync({ opts: { priority: 1 }, data : { workspaceId: 1, userId: '123', workspace: 'My Workspace', blockNumber: 1 }})
            .then(res => {
                expect(res).toEqual('Sync is disabled');
                done();
            });
    });

    it('Should return if too many failed rpc requests', (done) => {
        jest.spyOn(Workspace, 'findByPk').mockResolvedValueOnce({
            id: 1,
            rpcServer: 'http://localhost:8545',
            rpcHealthCheckEnabled: true,
            rpcHealthCheck: {
                isReachable: false
            },
            explorer: {
                hasReachedTransactionQuota,
                shouldSync: true
            }
        });
        blockSync({ opts: { priority: 1 }, data : { workspaceId: 1, userId: '123', workspace: 'My Workspace', blockNumber: 1 }})
            .then(res => {
                expect(res).toEqual('RPC is not reachable');
                done();
            });
    });

    it('Should return if no subscription', (done) => {
        jest.spyOn(Workspace, 'findByPk').mockResolvedValueOnce({
            id: 1,
            rpcServer: 'http://localhost:8545',
            rpcHealthCheckEnabled: true,
            rpcHealthCheck: {
                isReachable: true
            },
            explorer: {
                hasReachedTransactionQuota,
                shouldSync: true
            }
        });
        blockSync({ opts: { priority: 1 }, data : { workspaceId: 1, userId: '123', workspace: 'My Workspace', blockNumber: 1 }})
            .then(res => {
                expect(res).toEqual('No active subscription');
                done();
            });
    });

    it('Should sync partial block', (done) => {
        mockSafeCreatePartialBlock.mockResolvedValue({ transactions: []});
        ProviderConnector.mockImplementationOnce(() => ({
            fetchRawBlockWithTransactions: jest.fn(() => ({
                number: '0x1',
                customField: 1,
                transactions: [
                    { hash: '0x123' },
                    { hash: '0x456' },
                    { hash: '0x789' }
                ]
            })),
        }));

        blockSync({ opts: { priority: 1 }, data : { workspaceId: 1, userId: '123', workspace: 'My Workspace', blockNumber: 1 }})
            .then(res => {
                expect(res).toEqual('Block synced');
                expect(mockSafeCreatePartialBlock).toHaveBeenCalledWith({
                    number: 1,
                    raw: {
                        customField: 1
                    },
                    transactions: [
                        { hash: '0x123' },
                        { hash: '0x456' },
                        { hash: '0x789' }
                    ]
                });
                done();
            });
    });

    it('Should filter transactions when orbit config exists', (done) => {
        mockSafeCreatePartialBlock.mockResolvedValue({ transactions: []});

        // Mock initial workspace query (without L2 configs)
        const mockWorkspace = {
            id: 1,
            rpcServer: 'http://localhost:8545',
            rpcHealthCheck: {
                isReachable: true
            },
            explorer: {
                hasReachedTransactionQuota,
                stripeSubscription: {},
                shouldSync: true
            },
            safeCreatePartialBlock: mockSafeCreatePartialBlock
        };

        // Mock L2 configs query response with orbit config
        const mockL2Configs = {
            id: 1,
            orbitConfig: {
                rollupContract: '0x1234567890123456789012345678901234567890',
                sequencerInboxContract: '0x0987654321098765432109876543210987654321'
            },
            orbitChildConfigs: [],
            opChildConfigs: []
        };

        jest.spyOn(Workspace, 'findByPk')
            .mockResolvedValueOnce(mockWorkspace)    // First call: lightweight query
            .mockResolvedValueOnce(mockL2Configs);   // Second call: L2 configs with orbit config

        jest.spyOn(OrbitChainConfig, 'findAll').mockResolvedValue([]);
        
        ProviderConnector.mockImplementationOnce(() => ({
            fetchRawBlockWithTransactions: jest.fn(() => ({
                number: '0x1',
                customField: 1,
                transactions: [
                    { hash: '0x123', to: '0x1234567890123456789012345678901234567890' },
                    { hash: '0x456', to: '0x0987654321098765432109876543210987654321' },
                    { hash: '0x789', to: '0x1111111111111111111111111111111111111111' }
                ]
            })),
        }));

        blockSync({ opts: { priority: 1 }, data : { workspaceId: 1, userId: '123', workspace: 'My Workspace', blockNumber: 1 }})
            .then(res => {
                expect(res).toEqual('Block synced');
                expect(mockSafeCreatePartialBlock).toHaveBeenCalledWith({
                    number: 1,
                    raw: {
                        customField: 1
                    },
                    transactions: [
                        { hash: '0x123', to: '0x1234567890123456789012345678901234567890' },
                        { hash: '0x456', to: '0x0987654321098765432109876543210987654321' }
                    ],
                    transactionsCount: 2
                });
                done();
            });
    });

    it('Should filter transactions when orbit child configs exist', (done) => {
        mockSafeCreatePartialBlock.mockResolvedValue({ transactions: []});

        // Mock initial workspace query (without L2 configs)
        const mockWorkspace = {
            id: 1,
            rpcServer: 'http://localhost:8545',
            rpcHealthCheck: {
                isReachable: true
            },
            explorer: {
                hasReachedTransactionQuota,
                stripeSubscription: {},
                shouldSync: true
            },
            safeCreatePartialBlock: mockSafeCreatePartialBlock
        };

        // Mock L2 configs query response with orbit child configs
        const mockL2Configs = {
            id: 1,
            orbitConfig: null,
            orbitChildConfigs: [
                {
                    rollupContract: '0x1234567890123456789012345678901234567890',
                    bridgeContract: '0x0987654321098765432109876543210987654321'
                }
            ],
            opChildConfigs: []
        };

        jest.spyOn(Workspace, 'findByPk')
            .mockResolvedValueOnce(mockWorkspace)    // First call: lightweight query
            .mockResolvedValueOnce(mockL2Configs);   // Second call: L2 configs with orbit configs
        
        ProviderConnector.mockImplementationOnce(() => ({
            fetchRawBlockWithTransactions: jest.fn(() => ({
                number: '0x1',
                customField: 1,
                transactions: [
                    { hash: '0x123', to: '0x1234567890123456789012345678901234567890' },
                    { hash: '0x456', to: '0x0987654321098765432109876543210987654321' },
                    { hash: '0x789', to: '0x1111111111111111111111111111111111111111' }
                ]
            })),
        }));

        blockSync({ opts: { priority: 1 }, data : { workspaceId: 1, userId: '123', workspace: 'My Workspace', blockNumber: 1 }})
            .then(res => {
                expect(res).toEqual('Block synced');
                expect(mockSafeCreatePartialBlock).toHaveBeenCalledWith({
                    number: 1,
                    raw: {
                        customField: 1
                    },
                    transactions: [
                        { hash: '0x123', to: '0x1234567890123456789012345678901234567890' },
                        { hash: '0x456', to: '0x0987654321098765432109876543210987654321' }
                    ],
                    transactionsCount: 2
                });
                done();
            });
    });

    it('Should disable browser sync', (done) => {
        const mockUpdate = jest.fn().mockResolvedValue();
        jest.spyOn(Workspace, 'findByPk').mockResolvedValueOnce({
            id: 1,
            browserSyncEnabled: true,
            rpcServer: 'http://localhost:8545',
            rpcHealthCheck: {
                isReachable: true
            },
            explorer: {
                hasReachedTransactionQuota,
                stripeSubscription: {},
                shouldSync: true
            },
            safeCreatePartialBlock: mockSafeCreatePartialBlock,
            update: mockUpdate
        });
        jest.spyOn(db, 'syncPartialBlock').mockResolvedValue({ transactions: [] });
        blockSync({ opts: { priority: 1 }, data : { workspaceId: 1, userId: '123', workspace: 'My Workspace', blockNumber: 1 }})
            .then(res => {
                expect(res).toEqual('Block synced');
                expect(mockUpdate).toHaveBeenCalledWith({ browserSyncEnabled: false });
                done();
            });
    });

    it('Should set recovery status for integrity check', (done) => {
        jest.spyOn(Workspace, 'findByPk').mockResolvedValueOnce({
            id: 1,
            rpcServer: 'http://localhost:8545',
            integrityCheck: { isHealthy: true },
            explorer: {
                hasReachedTransactionQuota,
                stripeSubscription: {},
                shouldSync: true
            },
            safeCreatePartialBlock: mockSafeCreatePartialBlock
        });
        blockSync({ opts: { priority: 1 }, data : { workspaceId: 1, userId: '123', workspace: 'My Workspace', blockNumber: 1, source: 'recovery' }})
            .then(() => {
                expect(db.updateWorkspaceIntegrityCheck).toHaveBeenCalledWith(1, { status: 'recovering' });
                done();
            });
    });

    it('Should set healthy status for integrity check', (done) => {
        jest.spyOn(Workspace, 'findByPk').mockResolvedValueOnce({
            id: 1,
            rpcServer: 'http://localhost:8545',
            integrityCheck: { isRecovering: true },
            explorer: {
                hasReachedTransactionQuota,
                stripeSubscription: {},
                shouldSync: true
            },
            safeCreatePartialBlock: mockSafeCreatePartialBlock
        });
        blockSync({ opts: { priority: 1 }, data : { workspaceId: 1, userId: '123', workspace: 'My Workspace', blockNumber: 1, source: 'api' }})
            .then(() => {
                expect(db.updateWorkspaceIntegrityCheck).toHaveBeenCalledWith(1, { status: 'healthy' });
                done();
            });
    });

    it('Should use optimized single query to load workspace and L2 configs when workspaceId is provided', (done) => {
        mockSafeCreatePartialBlock.mockResolvedValue({ transactions: [
            { id: 1, hash: '0x123' }
        ]});

        // Mock the workspace query responses
        jest.spyOn(Workspace, 'findByPk')
            .mockResolvedValueOnce({
                id: 1,
                rpcServer: 'http://localhost:8545',
                explorer: { shouldSync: true, stripeSubscription: {} },
                safeCreatePartialBlock: mockSafeCreatePartialBlock
            })
            .mockResolvedValueOnce({
                id: 1,
                orbitConfig: null,
                orbitChildConfigs: [],
                opChildConfigs: []
            });

        blockSync({ opts: { priority: 1 }, data: { workspaceId: 1, blockNumber: 1, source: 'batchSync', rateLimited: true }})
            .then(res => {
                // Verify two Workspace.findByPk calls were made
                expect(Workspace.findByPk).toHaveBeenCalledTimes(2);

                // Verify the first query does NOT include L2 configs
                const firstCall = Workspace.findByPk.mock.calls[0][1];
                expect(firstCall.include).not.toEqual(expect.arrayContaining([
                    expect.objectContaining({ as: 'orbitConfig' }),
                    expect.objectContaining({ as: 'orbitChildConfigs' }),
                    expect.objectContaining({ as: 'opChildConfigs' })
                ]));

                // Verify the second query DOES include L2 configs (single optimized query)
                const secondCall = Workspace.findByPk.mock.calls[1][1];
                expect(secondCall.include).toEqual(expect.arrayContaining([
                    expect.objectContaining({ as: 'orbitConfig' }),
                    expect.objectContaining({ as: 'orbitChildConfigs' }),
                    expect.objectContaining({ as: 'opChildConfigs' })
                ]));

                expect(res).toEqual('Block synced');
                done();
            });
    });

    it('Should load L2 configurations in single optimized query when needed', (done) => {
        mockSafeCreatePartialBlock.mockResolvedValue({ transactions: [
            { id: 1, hash: '0x123' }
        ]});

        // Mock the initial workspace query (without L2 configs)
        const mockWorkspace = {
            id: 1,
            rpcServer: 'http://localhost:8545',
            explorer: { shouldSync: true, stripeSubscription: {} },
            safeCreatePartialBlock: mockSafeCreatePartialBlock
        };

        // Mock L2 configs that will be loaded in the second query
        const mockL2Configs = {
            id: 1,
            orbitConfig: { rollupContract: '0xorbit123' },
            orbitChildConfigs: [{ workspaceId: 2, rollupContract: '0xchild456' }],
            opChildConfigs: [{ workspaceId: 3, batchInboxAddress: '0xop789' }]
        };

        jest.spyOn(Workspace, 'findByPk')
            .mockResolvedValueOnce(mockWorkspace)  // First call: lightweight query
            .mockResolvedValueOnce(mockL2Configs); // Second call: L2 configs

        blockSync({ opts: { priority: 1 }, data: { workspaceId: 1, blockNumber: 1, source: 'batchSync', rateLimited: true }})
            .then(res => {
                // Verify two Workspace.findByPk calls were made
                expect(Workspace.findByPk).toHaveBeenCalledTimes(2);

                // Verify first call was lightweight (no L2 configs)
                const firstCall = Workspace.findByPk.mock.calls[0][1];
                expect(firstCall.include).not.toEqual(expect.arrayContaining([
                    expect.objectContaining({ as: 'orbitConfig' }),
                    expect.objectContaining({ as: 'orbitChildConfigs' }),
                    expect.objectContaining({ as: 'opChildConfigs' })
                ]));

                // Verify second call included L2 configs in single optimized query
                const secondCall = Workspace.findByPk.mock.calls[1][1];
                expect(secondCall.include).toEqual(expect.arrayContaining([
                    expect.objectContaining({ as: 'orbitConfig' }),
                    expect.objectContaining({ as: 'orbitChildConfigs' }),
                    expect.objectContaining({ as: 'opChildConfigs' })
                ]));

                expect(res).toEqual('Block synced');
                done();
            });
    });

    it('Should throw if workspaceId is missing', async () => {
        await expect(blockSync({ opts: { priority: 1 }, data: { blockNumber: 1 }}))
            .rejects.toThrow('Missing workspaceId');
    });

    it('Should return if no subscription for non-api source', (done) => {
        jest.spyOn(Workspace, 'findByPk').mockResolvedValueOnce({
            id: 1,
            rpcServer: 'http://localhost:8545',
            explorer: { shouldSync: true, stripeSubscription: null }
        });
        blockSync({ opts: { priority: 1 }, data: { workspaceId: 1, blockNumber: 1, source: 'integrityCheck' }})
            .then(res => {
                expect(res).toEqual('No active subscription');
                done();
            });
    });

    it('Should throw when blockNumber is missing', async () => {
        await expect(blockSync({ opts: { priority: 1 }, data: { workspaceId: 1 }}))
            .rejects.toThrow('Missing blockNumber');
    });

    it('Should fail if block cannot be found', (done) => {
        ProviderConnector.mockImplementationOnce(() => ({
            fetchRawBlockWithTransactions: jest.fn().mockResolvedValue(null)
        }));

        blockSync({
            data : {
                workspaceId: 1,
                userId: '123',
                workspace: 'My Workspace',
                blockNumber: 1
            }
        }).then(res => {
            expect(res).toEqual('Couldn\'t fetch block from provider');
            done();
        });
    });
});

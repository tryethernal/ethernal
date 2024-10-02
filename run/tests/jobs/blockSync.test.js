require('../mocks/lib/rateLimiter');
require('../mocks/lib/rpc');
require('../mocks/lib/queue');
require('../mocks/lib/firebase');
require('../mocks/lib/transactions');
require('../mocks/lib/logger');
const { Workspace } = require('../mocks/models');

const db = require('../../lib/firebase');
const { enqueue, bulkEnqueue } = require('../../lib/queue');
const { ProviderConnector } = require('../../lib/rpc');

const blockSync = require('../../jobs/blockSync');
const hasReachedTransactionQuota = jest.fn().mockResolvedValue(false);

beforeEach(() => jest.clearAllMocks());

describe('blockSync', () => {
    const mockSafeCreatePartialBlock = jest.fn();
    jest.spyOn(Workspace, 'findOne').mockResolvedValue({
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
    });

    it('Should queue transaction receipt processing', (done) => {
        mockSafeCreatePartialBlock.mockResolvedValue({ transactions: [
            { id: 1, hash: '0x123' },
            { id: 2, hash: '0x456' }
        ]});

        blockSync({ opts: { priority: 1 }, data : { userId: '123', workspace: 'My Workspace', blockNumber: 1 }})
            .then(res => {
                expect(bulkEnqueue).toHaveBeenCalledWith('receiptSync', [
                    { name: 'receiptSync-1-0x123', data: { transactionId: 1, transactionHash: '0x123', workspaceId: 1 }},
                    { name: 'receiptSync-1-0x456', data: { transactionId: 2, transactionHash: '0x456', workspaceId: 1 }}
                ], 1);
                expect(res).toEqual('Block synced');
                done();
            });
    });

    it('Should re-enqueue if rate limited', (done) => {
        jest.spyOn(Workspace, 'findOne').mockResolvedValueOnce({
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

        blockSync({ opts: { priority: 1 }, data : { source: 'cli-light', rateLimited: true, userId: '123', workspace: 'My Workspace', blockNumber: 1 }})
            .then(res => {
                expect(enqueue).toHaveBeenCalledWith('blockSync', 'blockSync-1-1', {
                    userId: 'abc',
                    workspace: 'ws',
                    blockNumber: 1,
                    source: 'cli-light',
                    rateLimited: true
                }, 1, null, 5000, true);
                expect(res).toEqual('Re-enqueuing: Rate limited');
                done();
            });
    });

    it.skip('Should return if transaction quota reached', (done) => {
        jest.spyOn(Workspace, 'findOne').mockResolvedValueOnce({
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
        blockSync({ opts: { priority: 1 }, data : { userId: '123', workspace: 'My Workspace', blockNumber: 1 }})
            .then(res => {
                expect(res).toEqual('Transaction quota reached');
                done();
            });
    });

    it('Should return if no active explorer', (done) => {
        jest.spyOn(Workspace, 'findOne').mockResolvedValueOnce({
            id: 1,
            rpcServer: 'http://localhost:8545',
            rpcHealthCheck: {
                isReachable: true
            },
            explorer: null
        });
        blockSync({ opts: { priority: 1 }, data : { userId: '123', workspace: 'My Workspace', blockNumber: 1 }})
            .then(res => {
                expect(res).toEqual('No active explorer for this workspace');
                done();
            });
    });

    it('Should return if sync is disabled', (done) => {
        jest.spyOn(Workspace, 'findOne').mockResolvedValueOnce({
            id: 1,
            rpcServer: 'http://localhost:8545',
            rpcHealthCheck: {
                isReachable: true
            },
            explorer: {
                shouldSync: false
            }
        });
        blockSync({ opts: { priority: 1 }, data : { userId: '123', workspace: 'My Workspace', blockNumber: 1 }})
            .then(res => {
                expect(res).toEqual('Sync is disabled');
                done();
            });
    });

    it('Should return if too many failed rpc requests', (done) => {
        jest.spyOn(Workspace, 'findOne').mockResolvedValueOnce({
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
        blockSync({ opts: { priority: 1 }, data : { userId: '123', workspace: 'My Workspace', blockNumber: 1 }})
            .then(res => {
                expect(res).toEqual('RPC is not reachable');
                done();
            });
    });

    it('Should return if no subscription', (done) => {
        jest.spyOn(Workspace, 'findOne').mockResolvedValueOnce({
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
        blockSync({ opts: { priority: 1 }, data : { userId: '123', workspace: 'My Workspace', blockNumber: 1 }})
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

        blockSync({ opts: { priority: 1 }, data : { userId: '123', workspace: 'My Workspace', blockNumber: 1 }})
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

    it('Should disable browser sync', (done) => {
        jest.spyOn(Workspace, 'findOne').mockResolvedValueOnce({
            id: 1,
            browserSyncEnabled: true,
            rpcServer: 'http://localhost:8545',
            rpcHealthCheck: {
                isReachable: true
            },
            explorer: {
                hasReachedTransactionQuota,
                shouldSync: true,
                stripeSubscription: {}
            },
            safeCreatePartialBlock: mockSafeCreatePartialBlock
        });
        jest.spyOn(db, 'syncPartialBlock').mockResolvedValue({ transactions: [] });
        blockSync({ opts: { priority: 1 }, data : { userId: '123', workspace: 'My Workspace', blockNumber: 1 }})
            .then(res => {
                expect(res).toEqual('Block synced');
                expect(db.updateBrowserSync).toHaveBeenCalledWith(1, false);
                done();
            });
    });

    it('Should set recovery status for integrity check', (done) => {
        jest.spyOn(Workspace, 'findOne').mockResolvedValueOnce({
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
        blockSync({ opts: { priority: 1 }, data : { userId: '123', workspace: 'My Workspace', blockNumber: 1, source: 'recovery' }})
            .then(() => {
                expect(db.updateWorkspaceIntegrityCheck).toHaveBeenCalledWith(1, { status: 'recovering' });
                done();
            });
    });

    it('Should set healthy status for integrity check', (done) => {
        jest.spyOn(Workspace, 'findOne').mockResolvedValueOnce({
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
        blockSync({ opts: { priority: 1 }, data : { userId: '123', workspace: 'My Workspace', blockNumber: 1, source: 'api' }})
            .then(() => {
                expect(db.updateWorkspaceIntegrityCheck).toHaveBeenCalledWith(1, { status: 'healthy' });
                done();
            });
    });

    it('Should fail if block cannot be found', (done) => {
        ProviderConnector.mockImplementationOnce(() => ({
            fetchRawBlockWithTransactions: jest.fn().mockResolvedValue(null)
        }));

        blockSync({
            data : {
                userId: '123',
                workspace: 'My Workspace',
                blockNumber: 1
            }
        }).then(res => {
            expect(res).toEqual("Couldn't fetch block from provider");
            done();
        });
    });
});

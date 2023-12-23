require('../mocks/lib/rpc');
require('../mocks/lib/queue');
require('../mocks/lib/firebase');
require('../mocks/lib/transactions');
require('../mocks/lib/logger');
const { User } = require('../mocks/models');

const db = require('../../lib/firebase');
const { ProviderConnector } = require('../../lib/rpc');

const blockSync = require('../../jobs/blockSync');
const hasReachedTransactionQuota = jest.fn().mockResolvedValue(false);

beforeEach(() => jest.clearAllMocks());

describe('blockSync', () => {
    jest.spyOn(User, 'findByAuthIdWithWorkspace').mockResolvedValue({
        workspaces: [{
            id: 1,
            rpcServer: 'http://localhost:8545',
            rpcHealthCheck: {
                isReachable: true
            },
            explorer: {
                hasReachedTransactionQuota,
                stripeSubscription: {},
                shouldSync: true
            }
        }]
    });

    it('Should return if transaction quota reached', (done) => {
        jest.spyOn(User, 'findByAuthIdWithWorkspace').mockResolvedValueOnce({
            workspaces: [{
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
            }]
        });
        blockSync({ data : { userId: '123', workspace: 'My Workspace', blockNumber: 1 }})
            .then(res => {
                expect(res).toEqual('Transaction quota reached');
                done();
            });
    });

    it('Should return if no active explorer', (done) => {
        jest.spyOn(User, 'findByAuthIdWithWorkspace').mockResolvedValueOnce({
            workspaces: [{
                id: 1,
                rpcServer: 'http://localhost:8545',
                rpcHealthCheck: {
                    isReachable: true
                },
                explorer: null
            }]
        });
        blockSync({ data : { userId: '123', workspace: 'My Workspace', blockNumber: 1 }})
            .then(res => {
                expect(res).toEqual('No active explorer for this workspace');
                done();
            });
    });

    it('Should return if sync is disabled', (done) => {
        jest.spyOn(User, 'findByAuthIdWithWorkspace').mockResolvedValueOnce({
            workspaces: [{
                id: 1,
                rpcServer: 'http://localhost:8545',
                rpcHealthCheck: {
                    isReachable: true
                },
                explorer: {
                    shouldSync: false
                }
            }]
        });
        blockSync({ data : { userId: '123', workspace: 'My Workspace', blockNumber: 1 }})
            .then(res => {
                expect(res).toEqual('Sync is disabled');
                done();
            });
    });

    it('Should return if too many failed rpc requests', (done) => {
        jest.spyOn(User, 'findByAuthIdWithWorkspace').mockResolvedValueOnce({
            workspaces: [{
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
            }]
        });
        blockSync({ data : { userId: '123', workspace: 'My Workspace', blockNumber: 1 }})
            .then(res => {
                expect(res).toEqual('RPC is not reachable');
                done();
            });
    });

    it('Should return if no subscription', (done) => {
        jest.spyOn(User, 'findByAuthIdWithWorkspace').mockResolvedValueOnce({
            workspaces: [{
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
            }]
        });
        blockSync({ data : { userId: '123', workspace: 'My Workspace', blockNumber: 1 }})
            .then(res => {
                expect(res).toEqual('No active subscription');
                done();
            });
    });

    it('Should sync partial block', (done) => {
        jest.spyOn(db, 'syncPartialBlock').mockResolvedValue({ transactions: [] });
        blockSync({ data : { userId: '123', workspace: 'My Workspace', blockNumber: 1 }})
            .then(res => {
                expect(res).toEqual('Block synced');
                expect(db.syncPartialBlock).toHaveBeenCalledWith(1, {
                    number: 1,
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
        jest.spyOn(User, 'findByAuthIdWithWorkspace').mockResolvedValueOnce({
            workspaces: [{
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
                }
            }]
        });
        jest.spyOn(db, 'syncPartialBlock').mockResolvedValue({ transactions: [] });
        blockSync({ data : { userId: '123', workspace: 'My Workspace', blockNumber: 1 }})
            .then(res => {
                expect(res).toEqual('Block synced');
                expect(db.updateBrowserSync).toHaveBeenCalledWith(1, false);
                done();
            });
    });

    it('Should set recovery status for integrity check', (done) => {
        jest.spyOn(User, 'findByAuthIdWithWorkspace').mockResolvedValueOnce({
            workspaces: [{
                id: 1,
                rpcServer: 'http://localhost:8545',
                integrityCheck: { isHealthy: true },
                explorer: {
                    hasReachedTransactionQuota,
                    stripeSubscription: {},
                    shouldSync: true
                }
            }]
        });
        blockSync({ data : { userId: '123', workspace: 'My Workspace', blockNumber: 1, source: 'recovery' }})
            .then(() => {
                expect(db.updateWorkspaceIntegrityCheck).toHaveBeenCalledWith(1, { status: 'recovering' });
                done();
            });
    });

    it('Should set healthy status for integrity check', (done) => {
        jest.spyOn(User, 'findByAuthIdWithWorkspace').mockResolvedValueOnce({
            workspaces: [{
                id: 1,
                rpcServer: 'http://localhost:8545',
                integrityCheck: { isRecovering: true },
                explorer: {
                    hasReachedTransactionQuota,
                    stripeSubscription: {},
                    shouldSync: true
                }
            }]
        });
        blockSync({ data : { userId: '123', workspace: 'My Workspace', blockNumber: 1, source: 'api' }})
            .then(() => {
                expect(db.updateWorkspaceIntegrityCheck).toHaveBeenCalledWith(1, { status: 'healthy' });
                done();
            });
    });

    it('Should fail if block cannot be found', (done) => {
        ProviderConnector.mockImplementationOnce(() => ({
            fetchBlockWithTransactions: jest.fn().mockResolvedValue(null)
        }));

        blockSync({
            data : {
                userId: '123',
                workspace: 'My Workspace',
                blockNumber: 1
            }
        }).catch(error => {
            expect(error.message).toEqual("Couldn't fetch block from provider");
            expect(db.incrementFailedAttempts).toHaveBeenCalledWith(1);
            done();
        });
    });

    it('Should return if block already exists', (done) => {
        jest.spyOn(db, 'getWorkspaceBlock').mockResolvedValueOnce({ id: 1 });
        blockSync({ data : { userId: '123', workspace: 'My Workspace', blockNumber: 1, source: 'api' }})
            .then(res => {
                expect(res).toEqual('Block already exists in this workspace');
                done();
            });
    });
});

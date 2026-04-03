require('../mocks/lib/queue');
require('../mocks/lib/pm2');
require('../mocks/lib/logger');
const { Explorer } = require('../mocks/models');

const PM2 = require('../../lib/pm2');
const updateExplorerSyncingProcess = require('../../jobs/updateExplorerSyncingProcess');

beforeEach(() => jest.clearAllMocks());

const hasReachedTransactionQuota = jest.fn().mockResolvedValue(false);
const incrementSyncFailures = jest.fn();
const update = jest.fn();

describe('updateExplorerSyncingProcess', () => {
    it('Should throw on timeout so BullMQ retries', (done) => {
        const reset = jest.fn();
        PM2.mockImplementationOnce(() => ({
            reset,
            find: jest.fn().mockRejectedValueOnce(new Error('Timed out after 10000ms.'))
        }));
        jest.spyOn(Explorer, 'findOne').mockResolvedValue({ slug: 'slug', workspaceId: 1, shouldSync: false });

        updateExplorerSyncingProcess({ data: { explorerSlug: 'explorer' }})
            .catch(error => {
                expect(error.message).toEqual('Timed out after 10000ms.');
                done();
            });
    });

    it('Should throw on timeout when sync is enabled so BullMQ retries', (done) => {
        PM2.mockImplementationOnce(() => ({
            find: jest.fn().mockRejectedValueOnce(new Error('Timed out after 10000ms.'))
        }));
        jest.spyOn(Explorer, 'findOne').mockResolvedValue({
            id: 1,
            slug: 'slug',
            workspaceId: 1,
            shouldSync: true
        });

        updateExplorerSyncingProcess({ data: { explorerSlug: 'explorer' }})
            .catch(error => {
                expect(error.message).toEqual('Timed out after 10000ms.');
                done();
            });
    });

    it('Should throw on TLS connection error so BullMQ retries', (done) => {
        PM2.mockImplementationOnce(() => ({
            find: jest.fn().mockRejectedValueOnce(new Error('Client network socket disconnected before secure TLS connection was established'))
        }));
        jest.spyOn(Explorer, 'findOne').mockResolvedValue({
            id: 1,
            slug: 'slug',
            workspaceId: 1,
            shouldSync: true
        });

        updateExplorerSyncingProcess({ data: { explorerSlug: 'explorer' }})
            .catch(error => {
                expect(error.message).toEqual('Client network socket disconnected before secure TLS connection was established');
                done();
            });
    });

    it('Should reset if flag is passed', (done) => {
        const reset = jest.fn();
        PM2.mockImplementationOnce(() => ({
            reset,
            find: jest.fn().mockResolvedValue({ data: { pm2_env: { status: 'online' }}})
        }));
        jest.spyOn(Explorer, 'findOne').mockResolvedValue({ slug: 'slug', workspaceId: 1 });

        updateExplorerSyncingProcess({ data: { explorerSlug: 'explorer', reset: true }})
            .then(res => {
                expect(reset).toHaveBeenCalledWith('slug', 1);
                expect(res).toEqual('Process reset.');
                done();
            });
    });

    it('Should delete if no explorer', (done) => {
        PM2.mockImplementationOnce(() => ({
            delete: jest.fn(),
            find: jest.fn().mockResolvedValue({ data: { pm2_env: { status: 'online' }}})
        }));
        jest.spyOn(Explorer, 'findOne').mockResolvedValue(null);

        updateExplorerSyncingProcess({ data: { explorerSlug: 'explorer' }})
            .then(res => {
                expect(res).toEqual('Process deleted: no explorer.');
                done();
            });
    });

    it('Should not change anything', (done) => {
        jest.spyOn(Explorer, 'findOne').mockResolvedValueOnce(null);
        PM2.mockImplementationOnce(() => ({
            find: jest.fn().mockResolvedValue({ data: null })
        }));

        updateExplorerSyncingProcess({ data: { hasReachedTransactionQuota, explorerSlug: 'explorer' }})
            .then(res => {
                expect(res).toEqual('No process change.');
                done();
            });
    });

    it('Should delete if transaction quota has been reached', (done) => {
        PM2.mockImplementationOnce(() => ({
            delete: jest.fn(),
            find: jest.fn().mockResolvedValue({ data: { pm2_env: { status: 'online' }}})
        }));
        jest.spyOn(Explorer, 'findOne').mockResolvedValueOnce({
            hasReachedTransactionQuota: hasReachedTransactionQuota.mockResolvedValueOnce(true),
            shouldSync: true,
            stripeSubscription: {},
            workspace: {
                rpcHealthCheck: {
                    isReachable: true
                }
            }
        });

        updateExplorerSyncingProcess({ data: { explorerSlug: 'explorer' }})
            .then(res => {
                expect(res).toEqual('Process deleted: transaction quota reached.');
                done();
            });
    });

    it('Should delete if rpc is not reachable and increment failures', (done) => {
        PM2.mockImplementationOnce(() => ({
            delete: jest.fn(),
            find: jest.fn().mockResolvedValue({ data: { pm2_env: { status: 'online' }}})
        }));
        const mockIncrementSyncFailures = jest.fn().mockResolvedValue({ disabled: false, attempts: 1 });
        jest.spyOn(Explorer, 'findOne').mockResolvedValueOnce({
            id: 1,
            slug: 'test-explorer',
            stripeSubscription: {},
            hasReachedTransactionQuota,
            incrementSyncFailures: mockIncrementSyncFailures,
            workspace: {
                rpcHealthCheck: {
                    isReachable: false
                }
            }
        });

        updateExplorerSyncingProcess({ data: { explorerSlug: 'explorer' }})
            .then(res => {
                expect(mockIncrementSyncFailures).toHaveBeenCalledWith('rpc_unreachable');
                expect(res).toEqual('Process deleted: RPC is not reachable (attempt 1/3).');
                done();
            });
    });

    it('Should auto-disable sync after 3 RPC failures', (done) => {
        PM2.mockImplementationOnce(() => ({
            delete: jest.fn(),
            find: jest.fn().mockResolvedValue({ data: { pm2_env: { status: 'online' }}})
        }));
        const mockIncrementSyncFailures = jest.fn().mockResolvedValue({ disabled: true, attempts: 3 });
        jest.spyOn(Explorer, 'findOne').mockResolvedValueOnce({
            id: 1,
            slug: 'test-explorer',
            stripeSubscription: {},
            hasReachedTransactionQuota,
            incrementSyncFailures: mockIncrementSyncFailures,
            workspace: {
                rpcHealthCheck: {
                    isReachable: false
                }
            }
        });

        updateExplorerSyncingProcess({ data: { explorerSlug: 'explorer' }})
            .then(res => {
                expect(mockIncrementSyncFailures).toHaveBeenCalledWith('rpc_unreachable');
                expect(res).toEqual('Process deleted and sync auto-disabled after 3 RPC failures.');
                done();
            });
    });

    it('Should delete if no subscription', (done) => {
        PM2.mockImplementationOnce(() => ({
            delete: jest.fn(),
            find: jest.fn().mockResolvedValue({ data: { pm2_env: { status: 'online' }}})
        }));
        jest.spyOn(Explorer, 'findOne').mockResolvedValueOnce({
            workspace: {
                rpcHealthCheck: {
                    isReachable: false
                }
            }
        });

        updateExplorerSyncingProcess({ data: { explorerSlug: 'explorer' }})
            .then(res => {
                expect(res).toEqual('Process deleted: no subscription.');
                done();
            });
    });

    it('Should delete if no workspace', (done) => {
        PM2.mockImplementationOnce(() => ({
            delete: jest.fn(),
            find: jest.fn().mockResolvedValue({ data: { pm2_env: { status: 'online' }}})
        }));
        jest.spyOn(Explorer, 'findOne').mockResolvedValueOnce({
            slug: 'test-explorer',
            stripeSubscription: {},
            workspace: null
        });

        updateExplorerSyncingProcess({ data: { explorerSlug: 'explorer' }})
            .then(res => {
                expect(res).toEqual('Process deleted: no workspace.');
                done();
            });
    });

    it('Should delete if sync is disabled', (done) => {
        PM2.mockImplementationOnce(() => ({
            delete: jest.fn(),
            find: jest.fn().mockResolvedValue({ data: { pm2_env: { status: 'online' }}})
        }));
        jest.spyOn(Explorer, 'findOne').mockResolvedValueOnce({
            hasReachedTransactionQuota,
            stripeSubscription: {},
            shouldSync: false,
            workspace: {}
        });

        updateExplorerSyncingProcess({ data: { explorerSlug: 'explorer' }})
            .then(res => {
                expect(res).toEqual('Process deleted: sync is disabled.');
                done();
            });
    });

    it('Should delete if transaction quota has been reached', (done) => {
        PM2.mockImplementationOnce(() => ({
            delete: jest.fn(),
            find: jest.fn().mockResolvedValue({ data: { pm2_env: { status: 'online' }}})
        }));
        jest.spyOn(Explorer, 'findOne').mockResolvedValueOnce({
            hasReachedTransactionQuota,
            stripeSubscription: {},
            shouldSync: false,
            workspace: {}
        });

        updateExplorerSyncingProcess({ data: { explorerSlug: 'explorer' }})
            .then(res => {
                expect(res).toEqual('Process deleted: sync is disabled.');
                done();
            });
    });

    it('Should start process if it does not exist', (done) => {
        PM2.mockImplementationOnce(() => ({
            start: jest.fn(),
            find: jest.fn().mockResolvedValue({ data: null })
        }));
        jest.spyOn(Explorer, 'findOne').mockResolvedValueOnce({
            hasReachedTransactionQuota,
            stripeSubscription: {},
            shouldSync: true,
            syncFailedAttempts: 0,
            workspace: {}
        });

        updateExplorerSyncingProcess({ data: { explorerSlug: 'explorer' }})
            .then(res => {
                expect(res).toEqual('Process started.');
                done();
            });
    });

    it('Should reset failure counter on successful start', (done) => {
        PM2.mockImplementationOnce(() => ({
            start: jest.fn(),
            find: jest.fn().mockResolvedValue({ data: null })
        }));
        const mockUpdate = jest.fn();
        jest.spyOn(Explorer, 'findOne').mockResolvedValueOnce({
            hasReachedTransactionQuota,
            stripeSubscription: {},
            shouldSync: true,
            syncFailedAttempts: 2,
            update: mockUpdate,
            workspace: {}
        });

        updateExplorerSyncingProcess({ data: { explorerSlug: 'explorer' }})
            .then(res => {
                expect(mockUpdate).toHaveBeenCalledWith({ syncFailedAttempts: 0 });
                expect(res).toEqual('Process started.');
                done();
            });
    });

    it('Should resume process if it is stopped', (done) => {
        PM2.mockImplementationOnce(() => ({
            resume: jest.fn(),
            find: jest.fn().mockResolvedValue({ data: { pm2_env: { status: 'stopped' }}})
        }));
        jest.spyOn(Explorer, 'findOne').mockResolvedValueOnce({
            hasReachedTransactionQuota,
            stripeSubscription: {},
            shouldSync: true,
            syncFailedAttempts: 0,
            workspace: {}
        });

        updateExplorerSyncingProcess({ data: { explorerSlug: 'explorer' }})
            .then(res => {
                expect(res).toEqual('Process resumed.');
                done();
            });
    });

    it('Should reset failure counter on successful resume', (done) => {
        PM2.mockImplementationOnce(() => ({
            resume: jest.fn(),
            find: jest.fn().mockResolvedValue({ data: { pm2_env: { status: 'stopped' }}})
        }));
        const mockUpdate = jest.fn();
        jest.spyOn(Explorer, 'findOne').mockResolvedValueOnce({
            hasReachedTransactionQuota,
            stripeSubscription: {},
            shouldSync: true,
            syncFailedAttempts: 1,
            update: mockUpdate,
            workspace: {}
        });

        updateExplorerSyncingProcess({ data: { explorerSlug: 'explorer' }})
            .then(res => {
                expect(mockUpdate).toHaveBeenCalledWith({ syncFailedAttempts: 0 });
                expect(res).toEqual('Process resumed.');
                done();
            });
    });
});

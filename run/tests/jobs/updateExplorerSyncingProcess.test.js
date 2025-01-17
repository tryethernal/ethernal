require('../mocks/lib/queue');
require('../mocks/lib/pm2');
const { Explorer } = require('../mocks/models');

const PM2 = require('../../lib/pm2');
const updateExplorerSyncingProcess = require('../../jobs/updateExplorerSyncingProcess');

beforeEach(() => jest.clearAllMocks());

const hasReachedTransactionQuota = jest.fn().mockResolvedValue(false);

describe('updateExplorerSyncingProcess', () => {
    it('Should exit gracefully if timeout', (done) => {
        const reset = jest.fn();
        PM2.mockImplementationOnce(() => ({
            reset,
            find: jest.fn().mockRejectedValueOnce(new Error('Timed out after 10000ms.'))
        }));
        jest.spyOn(Explorer, 'findOne').mockResolvedValue({ slug: 'slug', workspaceId: 1 });

        updateExplorerSyncingProcess({ data: { explorerSlug: 'explorer' }})
            .then(res => {
                expect(res).toEqual('Timed out');
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

    it('Should delete if rpc is not reachable', (done) => {
        PM2.mockImplementationOnce(() => ({
            delete: jest.fn(),
            find: jest.fn().mockResolvedValue({ data: { pm2_env: { status: 'online' }}})
        }));
        jest.spyOn(Explorer, 'findOne').mockResolvedValueOnce({
            stripeSubscription: {},
            hasReachedTransactionQuota,
            workspace: {
                rpcHealthCheck: {
                    isReachable: false
                }
            }
        });

        updateExplorerSyncingProcess({ data: { explorerSlug: 'explorer' }})
            .then(res => {
                expect(res).toEqual('Process deleted: RPC is not reachable.');
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
            workspace: {}
        });

        updateExplorerSyncingProcess({ data: { explorerSlug: 'explorer' }})
            .then(res => {
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
            workspace: {}
        });

        updateExplorerSyncingProcess({ data: { explorerSlug: 'explorer' }})
            .then(res => {
                expect(res).toEqual('Process resumed.');
                done();
            });
    });
});

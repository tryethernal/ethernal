require('../mocks/lib/rpc');
require('../mocks/lib/queue');
require('../mocks/lib/firebase');
require('../mocks/lib/transactions');
require('../mocks/lib/logger');

const db = require('../../lib/firebase');
const { ProviderConnector } = require('../../lib/rpc');
const { bulkEnqueue } = require('../../lib/queue');

const blockSync = require('../../jobs/blockSync');

beforeEach(() => jest.clearAllMocks());

describe('blockSync', () => {
    jest.spyOn(db, 'getWorkspaceByName').mockResolvedValue({
        id: 1,
        rpcServer: 'http://localhost:8545',
        explorer: {}
    });

    it('Should sync partial block', (done) => {
        jest.spyOn(db, 'syncPartialBlock').mockResolvedValue({ transactions: [] })
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

    it('Should set recovery status for integrity check', (done) => {
        jest.spyOn(db, 'getWorkspaceByName').mockResolvedValueOnce({
            id: 1,
            rpcServer: 'http://localhost:8545',
            integrityCheck: { isHealthy: true },
            explorer: {}
        });
        blockSync({ data : { userId: '123', workspace: 'My Workspace', blockNumber: 1, source: 'recovery' }})
            .then(() => {
                expect(db.updateWorkspaceIntegrityCheck).toHaveBeenCalledWith(1, { status: 'recovering' });
                done();
            });
    });

    it('Should set healthy status for integrity check', (done) => {
        jest.spyOn(db, 'getWorkspaceByName').mockResolvedValueOnce({
            id: 1,
            rpcServer: 'http://localhost:8545',
            integrityCheck: { isRecovering: true },
            explorer: {}
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
            done();
        });
    });

    it('Should return if block already exists', (done) => {
        jest.spyOn(db, 'getWorkspaceBlock').mockResolvedValueOnce({ id: 1 });
        blockSync({ data : { userId: '123', workspace: 'My Workspace', blockNumber: 1, source: 'api' }})
            .then(res => {
                expect(res).toEqual('Block already exists in this workspace.');
                done();
            });
    });
});

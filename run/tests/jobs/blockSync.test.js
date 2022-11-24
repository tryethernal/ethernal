require('../mocks/lib/rpc');
require('../mocks/lib/queue');
require('../mocks/lib/firebase');
require('../mocks/lib/transactions');

const db = require('../../lib/firebase');
const { ProviderConnector } = require('../../lib/rpc');
const { enqueue } = require('../../lib/queue');

const blockSync = require('../../jobs/blockSync');

afterAll(() => jest.clearAllMocks());

describe('blockSync', () => {
    jest.spyOn(db, 'getWorkspaceByName').mockResolvedValue({ rpcServer: 'http://localhost:8545' });

    it('Should enqueue each block transaction', (done) => {
        blockSync({ 
            data : {
                userId: '123',
                workspace: 'My Workspace',
                blockNumber: 1

            }
        }).then(() => {
            expect(enqueue).toHaveBeenCalledTimes(3);
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
});

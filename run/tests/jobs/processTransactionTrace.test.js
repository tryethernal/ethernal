require('../mocks/lib/firebase');
require('../mocks/lib/utils');
require('../mocks/lib/trace');
require('../mocks/lib/queue');
require('../mocks/lib/rpc');
require('../mocks/lib/ethers');

const db = require('../../lib/firebase');
const { Tracer } = require('../../lib/rpc');

const Transaction = require('../fixtures/Transaction.json');
const processTransactionTrace = require('../../jobs/processTransactionTrace');

beforeEach(() => jest.clearAllMocks());

const workspace = {
    id: 1,
    name: 'hardhat',
    rpcServer: 'http://test.com',
    user: { id: 1, firebaseUserId: '123' }
};

describe('processTransactionTrace', () => {
    it('Should process & store the trace if the workspace is public', async () => {
        const processTraceMock = jest.spyOn(Tracer.prototype, 'process');
        const saveTraceMock = jest.spyOn(Tracer.prototype, 'saveTrace');
        jest.spyOn(db, 'getTransactionForProcessing').mockResolvedValueOnce({ ...Transaction, workspace: { ...workspace, public: true, tracing: 'other' }});

        await processTransactionTrace({ data: { transactionId: 1 }});

        expect(processTraceMock).toHaveBeenCalledWith({ ...Transaction, workspace: { ...workspace, public: true, tracing: 'other' } });
        expect(saveTraceMock).toHaveBeenCalledWith('123', 'hardhat');
    });

    it('Should not process the trace for private workspaces', async () => {
        const processTraceMock = jest.spyOn(Tracer.prototype, 'process');
        jest.spyOn(db, 'getTransactionForProcessing').mockResolvedValueOnce({ ...Transaction, workspace });

        const res = await processTransactionTrace({ data: { transactionId: 1 }});

        expect(processTraceMock).not.toHaveBeenCalledWith(Transaction);
        expect(res).toEqual('Not allowed on private workspaces');
    });
});

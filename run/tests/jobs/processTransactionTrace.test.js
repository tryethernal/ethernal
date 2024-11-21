require('../mocks/lib/firebase');
const { Transaction } = require('../mocks/models');
require('../mocks/lib/utils');
require('../mocks/lib/trace');
require('../mocks/lib/queue');
require('../mocks/lib/rpc');
require('../mocks/lib/ethers');

const db = require('../../lib/firebase');
const { Tracer } = require('../../lib/rpc');

const transactionMock = {
    "blockHash":"0x02cfea90863e2b298f07b8981cfb0ae04c66ebbfa895338030dde272cb3ddc32",
    "data":"0xa9059cbb000000000000000000000000c00e94cb662c3520282e6f5717214004a7f268880000000000000000000000000000000000000000000000000000000000000001",
    "transactionIndex":0,
    "confirmations":1,
    "nonce":2196963,
    "gasLimit":"123455",
    "r":"0x4ba8b20554c3997fcc63e94d68f15ff88e7b8f62828677cfe16dc376df65e8b8",
    "s":"0x766f5cd25f9e0acc31f0ef296eda16f3439c663b9866ef891d58636b46c794a7",
    "chainId":1,
    "v":38,
    "blockNumber":12695880,
    "from":"0xe93381fb4c4f14bda253907b18fad305d799241a",
    "to":"0xc00e94cb662c3520282e6f5717214004a7f26888",
    "value":"0",
    "hash":"0xb750fb9dd193bb4a46ea5426837c469815d2494abd68a94b1c2c190f3569c5b8",
    "gasPrice":"23",
    "timestamp":1624524964,
    safeCreateTransactionTrace: jest.fn()
};
const processTransactionTrace = require('../../jobs/processTransactionTrace');

beforeEach(() => jest.clearAllMocks());

const workspace = {
    id: 1,
    name: 'hardhat',
    rpcServer: 'http://test.com',
    user: { id: 1, firebaseUserId: '123' },
    public: true,
    explorer: {
        shouldSync: true,
        rpcHealthCheck: {
            isReachable: true,
        },
        stripeSubscription: {}
    }
};

describe('processTransactionTrace', () => {
    it('Should return if no explorer', async () => {
        jest.spyOn(Transaction, 'findByPk').mockResolvedValueOnce({ ...transactionMock, workspace: { ...workspace, public: true, explorer: null }});

        const res = await processTransactionTrace({ data: { transactionId: 1 }});
        expect(res).toEqual('Inactive explorer');
    });

    // it('Should return if sync is disabled', async () => {
    //     jest.spyOn(db, 'getTransactionForProcessing').mockResolvedValueOnce({ ...Transaction, workspace: { ...workspace, public: true, explorer: { shouldSync: false }}});

    //     const res = await processTransactionTrace({ data: { transactionId: 1 }});
    //     expect(res).toEqual('Sync is disabled');
    // });

    it('Should return if RPC is not reachable', async () => {
        jest.spyOn(Transaction, 'findByPk').mockResolvedValueOnce({ ...transactionMock, workspace: { ...workspace, rpcHealthCheckEnabled: true, public: true, rpcHealthCheck: { isReachable: false }, explorer: { shouldSync: true }}});

        const res = await processTransactionTrace({ data: { transactionId: 1 }});
        expect(res).toEqual('RPC is not reachable');
    });

    it('Should return if no subscription', async () => {
        jest.spyOn(Transaction, 'findByPk').mockResolvedValueOnce({ ...transactionMock, workspace: { ...workspace, public: true, rpcHealthCheck: { isReachable: true }, explorer: { shouldSync: true }}});

        const res = await processTransactionTrace({ data: { transactionId: 1 }});
        expect(res).toEqual('No active subscription');
    });

    it('Should process & store the trace if the workspace is public', async () => {
        const processTraceMock = jest.spyOn(Tracer.prototype, 'process');
        const saveTraceMock = jest.spyOn(Tracer.prototype, 'saveTrace');
        jest.spyOn(Transaction, 'findByPk').mockResolvedValueOnce({ ...transactionMock, workspace: { ...workspace, public: true, tracing: 'other' }});

        await processTransactionTrace({ data: { transactionId: 1 }});

        expect(processTraceMock).toHaveBeenCalledWith({ ...transactionMock, workspace: { ...workspace, public: true, tracing: 'other' } });
        expect(transactionMock.safeCreateTransactionTrace).toHaveBeenCalledWith([{"op": "CALL"}, {"op": "CALLSTATIC"}]);
    });

    it('Should not process the trace for private workspaces', async () => {
        const processTraceMock = jest.spyOn(Tracer.prototype, 'process');
        jest.spyOn(Transaction, 'findByPk').mockResolvedValueOnce({ ...transactionMock, workspace: { ...workspace, public: false, explorer: null }});

        const res = await processTransactionTrace({ data: { transactionId: 1 }});

        expect(processTraceMock).not.toHaveBeenCalledWith(Transaction);
        expect(res).toEqual('Not allowed on private workspaces');
    });
});

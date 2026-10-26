require('../mocks/lib/queue');
require('../mocks/lib/rpc');
require('../mocks/lib/utils');
require('../mocks/lib/env');
require('../mocks/lib/flags');
require('../mocks/lib/logger');
require('../mocks/models');
require('../mocks/lib/firebase');
require('../mocks/lib/crypto');
require('../mocks/lib/lock');
require('../mocks/lib/processContractVerification');
const db = require('../../lib/firebase');
const { ProviderConnector } = require('../../lib/rpc');
const { etherscanDispatcher, dispatchTable } = require('../../lib/etherscanDispatch');

const supertest = require('supertest');
const app = require('../../app');
const request = supertest(app);

const ADDRESS = '0x' + 'AB'.repeat(20);
const LOWER = ADDRESS.toLowerCase();
const HASH = '0x' + 'cd'.repeat(32);
const EXPLORER = {
    id: 5,
    name: 'My Chain',
    slug: 'mychain',
    stripeSubscription: { id: 1 },
    workspace: { id: 7, name: 'my-workspace', public: true },
    admin: { firebaseUserId: 'uid-admin' }
};
const WORKSPACE = { id: 7, name: 'my-workspace', public: true, rpcServer: 'http://rpc.local' };
const OK = (result) => ({ status: '1', message: 'OK', result });
const NOTOK = (result) => ({ status: '0', message: 'NOTOK', result });

const call = (query, headers = {}) => request.get('/api').set(headers).query({ apikey: 'mychain', ...query });

beforeEach(() => {
    jest.clearAllMocks();
    Object.values(db).forEach(fn => fn.mockReset());
    db.getPublicExplorerParamsBySlug.mockResolvedValue(EXPLORER);
    db.getWorkspaceByNameAuth.mockResolvedValue(WORKSPACE);
});

describe('Etherscan dispatcher', () => {
    const fakeReq = (overrides = {}) => ({ path: '/api', url: '/api', method: 'GET', query: {}, body: {}, ...overrides });
    const dispatch = (req) => { etherscanDispatcher(req, {}, jest.fn()); return req.url; };

    it('Should only touch requests to /api', () => {
        expect(dispatch(fakeReq({ path: '/api/blocks', url: '/api/blocks', query: { module: 'contract', action: 'getsourcecode' } }))).toBe('/api/blocks');
    });

    it('Should keep the four existing contract actions and their targets', () => {
        expect(dispatch(fakeReq({ method: 'POST', body: { module: 'contract', action: 'verifysourcecode' } }))).toBe('/api/contracts/verify');
        expect(dispatch(fakeReq({ query: { module: 'contract', action: 'getsourcecode' } }))).toBe('/api/contracts/sourceCode');
        expect(dispatch(fakeReq({ query: { module: 'contract', action: 'getabi' } }))).toBe('/api/contracts/getabi');
        expect(dispatch(fakeReq({ query: { module: 'contract', action: 'checkverifystatus', guid: 'x' } }))).toBe('/api/contracts/verificationStatus');
    });

    it('Should keep the legacy matching semantics', () => {
        // checkverifystatus needs a guid
        expect(dispatch(fakeReq({ query: { module: 'contract', action: 'checkverifystatus' } }))).toBe('/api');
        // getabi matches on the query string only
        expect(dispatch(fakeReq({ method: 'POST', body: { module: 'contract', action: 'getabi' } }))).toBe('/api');
        // legacy actions merge query then body: the body wins
        expect(dispatch(fakeReq({ query: { module: 'contract', action: 'getsourcecode' }, body: { action: 'other' } }))).toBe('/api');
        expect(dispatch(fakeReq({ query: { module: 'contract', action: 'other' }, body: { action: 'getsourcecode' } }))).toBe('/api/contracts/sourceCode');
        // the HTTP method is not checked
        expect(dispatch(fakeReq({ method: 'POST', query: { module: 'contract', action: 'getsourcecode' } }))).toBe('/api/contracts/sourceCode');
    });

    it('Should rewrite the new actions with query-over-body precedence, GET only', () => {
        expect(dispatch(fakeReq({ query: { module: 'account', action: 'txlist' } }))).toBe('/api/etherscan/account/txlist');
        expect(dispatch(fakeReq({ query: { module: 'account', action: 'txlist' }, body: { action: 'balance' } }))).toBe('/api/etherscan/account/txlist');
        expect(dispatch(fakeReq({ query: { module: 'account', action: 'nope' }, body: { action: 'txlist' } }))).toBe('/api');
        expect(dispatch(fakeReq({ method: 'POST', query: { module: 'account', action: 'txlist' } }))).toBe('/api');
        expect(dispatch(fakeReq({ query: { module: 'logs', action: 'getLogs' } }))).toBe('/api/etherscan/logs/getLogs');
    });

    it('Should also rewrite /api/ (the OpenAPI document models the layer as GET / under /api)', () => {
        expect(dispatch(fakeReq({ path: '/api/', url: '/api/?module=account&action=txlist', query: { module: 'account', action: 'txlist' } }))).toBe('/api/etherscan/account/txlist');
        expect(dispatch(fakeReq({ path: '/api/', url: '/api/', query: { module: 'contract', action: 'getsourcecode' } }))).toBe('/api/contracts/sourceCode');
        expect(dispatch(fakeReq({ path: '/api/', url: '/api/', query: { module: 'proxy', action: 'x' } }))).toBe('/api/');
    });

    it('Should leave unknown module/action untouched', () => {
        expect(dispatch(fakeReq({ query: { module: 'proxy', action: 'eth_blockNumber' } }))).toBe('/api');
        expect(dispatch(fakeReq({ query: {} }))).toBe('/api');
    });

    it('Should list the methods each target accepts', () => {
        expect(dispatchTable.map(e => [e.key, e.methods])).toEqual([
            ['contract/verifysourcecode', ['POST']],
            ['contract/getsourcecode', ['GET']],
            ['contract/getabi', ['GET']],
            ['contract/checkverifystatus', ['GET', 'POST']],
            ['account/balance', ['GET']],
            ['account/balancemulti', ['GET']],
            ['account/txlist', ['GET']],
            ['transaction/getstatus', ['GET']],
            ['transaction/gettxreceiptstatus', ['GET']],
            ['block/getblocknumberbytime', ['GET']],
            ['logs/getLogs', ['GET']]
        ]);
    });

    it('Should keep returning 404 for unknown actions on /api', async () => {
        await request.get('/api').query({ module: 'proxy', action: 'eth_blockNumber' }).expect(404);
        await request.get('/api').expect(404);
    });

    it('Should not route new actions sent with another method than GET', async () => {
        await request.post('/api').send({ module: 'account', action: 'txlist', address: ADDRESS }).expect(404);
    });

    it('Should still route contract/checkverifystatus', async () => {
        const { body } = await request.get('/api').query({ module: 'contract', action: 'checkverifystatus', guid: '1' }).expect(200);
        expect(body).toEqual(OK('Pass - Verified'));
    });

    it('Should still route contract/getabi to the legacy handler', async () => {
        db.getContractByWorkspaceId.mockResolvedValueOnce({ verification: { sources: [] } });
        const { body } = await request.get('/api').query({ module: 'contract', action: 'getabi', address: ADDRESS, apikey: 'mychain' }).expect(200);
        expect(body).toEqual(NOTOK('Contract source code not verified'));
    });
});

describe('Etherscan explorer resolution', () => {
    it('Should answer on /api/ with a trailing slash', async () => {
        db.getEtherscanTransactions.mockResolvedValue([]);

        const { body } = await request.get('/api/').query({ apikey: 'mychain', module: 'account', action: 'txlist', address: ADDRESS }).expect(200);

        expect(body.message).toBe('No transactions found');
    });

    it('Should answer with an error envelope when the explorer is not found', async () => {
        db.getPublicExplorerParamsBySlug.mockResolvedValue(null);

        const { body } = await call({ module: 'account', action: 'txlist', address: ADDRESS }).expect(200);

        expect(body).toEqual(NOTOK('Invalid API key or explorer not found'));
    });

    it('Should answer with the same error when the workspace is not public anymore', async () => {
        db.getWorkspaceByNameAuth.mockResolvedValue({ ...WORKSPACE, public: false });

        const { body } = await call({ module: 'account', action: 'txlist', address: ADDRESS }).expect(200);

        expect(body).toEqual(NOTOK('Invalid API key or explorer not found'));
        expect(db.getEtherscanTransactions).not.toHaveBeenCalled();
    });

    it('Should resolve the explorer from the host', async () => {
        db.getEtherscanTransactions.mockResolvedValue([]);

        const { body } = await request.get('/api').set('X-Forwarded-Host', 'mychain.ethernal.com').query({ module: 'account', action: 'txlist', address: ADDRESS }).expect(200);

        expect(body.message).toBe('No transactions found');
        expect(db.getPublicExplorerParamsBySlug).toHaveBeenCalledWith('mychain');
    });

    it('Should answer 200 with an error envelope on unexpected errors', async () => {
        db.getEtherscanTransactions.mockRejectedValue(new Error('db exploded'));

        const { body } = await call({ module: 'account', action: 'txlist', address: ADDRESS }).expect(200);

        expect(body).toEqual(NOTOK('Internal server error'));
    });
});

describe('account/balance', () => {
    it('Should return the balance in wei', async () => {
        const getBalance = jest.fn().mockResolvedValue({ toString: () => '1000000000000000000' });
        ProviderConnector.mockImplementation(() => ({ getBalance }));

        const { body } = await call({ module: 'account', action: 'balance', address: ADDRESS, tag: 'latest' }).expect(200);

        expect(body).toEqual(OK('1000000000000000000'));
        expect(ProviderConnector).toHaveBeenCalledWith('http://rpc.local');
        expect(getBalance).toHaveBeenCalledWith(LOWER);
    });

    it('Should accept a call without tag and ignore chainid', async () => {
        ProviderConnector.mockImplementation(() => ({ getBalance: jest.fn().mockResolvedValue({ toString: () => '5' }) }));

        const { body } = await call({ module: 'account', action: 'balance', address: ADDRESS, chainid: '1' }).expect(200);

        expect(body).toEqual(OK('5'));
    });

    it('Should reject another tag', async () => {
        const { body } = await call({ module: 'account', action: 'balance', address: ADDRESS, tag: 'pending' }).expect(200);
        expect(body).toEqual(NOTOK(`Invalid tag. Only 'latest' is supported`));
    });

    it('Should reject an invalid or missing address', async () => {
        expect((await call({ module: 'account', action: 'balance', address: '0x123' }).expect(200)).body).toEqual(NOTOK('Invalid address format'));
        expect((await call({ module: 'account', action: 'balance' }).expect(200)).body).toEqual(NOTOK('Invalid address format'));
    });

    it('Should report RPC failures', async () => {
        ProviderConnector.mockImplementation(() => ({ getBalance: jest.fn().mockRejectedValue(new Error('rpc down')) }));

        const { body } = await call({ module: 'account', action: 'balance', address: ADDRESS }).expect(200);

        expect(body).toEqual(NOTOK('Unable to fetch balance from the RPC server'));
    });
});

describe('account/balancemulti', () => {
    it('Should return the balance of each address', async () => {
        const second = '0x' + '12'.repeat(20);
        const getBalance = jest.fn().mockImplementation(async (address) => ({ toString: () => address === LOWER ? '1' : '2' }));
        ProviderConnector.mockImplementation(() => ({ getBalance }));

        const { body } = await call({ module: 'account', action: 'balancemulti', address: `${ADDRESS},${second}` }).expect(200);

        expect(body).toEqual(OK([{ account: LOWER, balance: '1' }, { account: second, balance: '2' }]));
    });

    it('Should accept up to 20 addresses', async () => {
        ProviderConnector.mockImplementation(() => ({ getBalance: jest.fn().mockResolvedValue({ toString: () => '0' }) }));
        const addresses = Array.from({ length: 20 }, (_, i) => '0x' + i.toString(16).padStart(40, '0'));

        const { body } = await call({ module: 'account', action: 'balancemulti', address: addresses.join(',') }).expect(200);

        expect(body.result).toHaveLength(20);
    });

    it('Should reject more than 20 addresses and invalid addresses', async () => {
        const addresses = Array.from({ length: 21 }, (_, i) => '0x' + i.toString(16).padStart(40, '0'));

        expect((await call({ module: 'account', action: 'balancemulti', address: addresses.join(',') }).expect(200)).body).toEqual(NOTOK('Maximum 20 addresses per request'));
        expect((await call({ module: 'account', action: 'balancemulti', address: `${ADDRESS},nope` }).expect(200)).body).toEqual(NOTOK('Invalid address format'));
        expect((await call({ module: 'account', action: 'balancemulti' }).expect(200)).body).toEqual(NOTOK('Invalid address format'));
    });
});

describe('account/txlist', () => {
    const row = (overrides = {}) => ({
        hash: HASH, blockNumber: 100, timeStamp: '1767265600', nonce: 4, blockHash: '0x' + 'ee'.repeat(32), transactionIndex: 2,
        from: LOWER, to: '0x' + '12'.repeat(20), value: '1000', gas: '21000', gasPrice: '1000000000', input: '0xa9059cbb' + '00'.repeat(64),
        methodSignature: 'transfer(address to, uint256 value)', receiptId: 9, status: true, contractAddress: null, cumulativeGasUsed: '42000', gasUsed: '21000',
        ...overrides
    });

    it('Should return the exact Etherscan fields', async () => {
        db.getEtherscanTransactions.mockResolvedValue([row()]);
        db.getLatestIndexedBlock.mockResolvedValue({ number: 112 });

        const { body } = await call({ module: 'account', action: 'txlist', address: ADDRESS }).expect(200);

        expect(body).toEqual(OK([{
            blockNumber: '100',
            timeStamp: '1767265600',
            hash: HASH,
            nonce: '4',
            blockHash: '0x' + 'ee'.repeat(32),
            transactionIndex: '2',
            from: LOWER,
            to: '0x' + '12'.repeat(20),
            value: '1000',
            gas: '21000',
            gasPrice: '1000000000',
            isError: '0',
            txreceipt_status: '1',
            input: '0xa9059cbb' + '00'.repeat(64),
            contractAddress: '',
            cumulativeGasUsed: '42000',
            gasUsed: '21000',
            confirmations: '12',
            methodId: '0xa9059cbb',
            functionName: 'transfer(address to, uint256 value)'
        }]));
        expect(Object.keys(body.result[0])).toEqual([
            'blockNumber', 'timeStamp', 'hash', 'nonce', 'blockHash', 'transactionIndex', 'from', 'to', 'value', 'gas', 'gasPrice', 'isError', 'txreceipt_status', 'input',
            'contractAddress', 'cumulativeGasUsed', 'gasUsed', 'confirmations', 'methodId', 'functionName'
        ]);
    });

    it('Should pass the defaults and lowercase the address to the query', async () => {
        db.getEtherscanTransactions.mockResolvedValue([]);

        await call({ module: 'account', action: 'txlist', address: ADDRESS }).expect(200);

        expect(db.getEtherscanTransactions).toHaveBeenCalledWith(7, { address: LOWER, startBlock: 0, endBlock: 2147483647, sort: 'asc', page: 1, offset: 100 });
    });

    it('Should pass the block range, sort and pagination', async () => {
        db.getEtherscanTransactions.mockResolvedValue([]);

        await call({ module: 'account', action: 'txlist', address: ADDRESS, startblock: '10', endblock: '99999999999', sort: 'desc', page: '3', offset: '50' }).expect(200);

        expect(db.getEtherscanTransactions).toHaveBeenCalledWith(7, { address: LOWER, startBlock: 10, endBlock: 2147483647, sort: 'desc', page: 3, offset: 50 });
    });

    it('Should read parameters with query-over-body precedence', async () => {
        db.getEtherscanTransactions.mockResolvedValue([]);

        await request.get('/api').query({ module: 'account', action: 'txlist', apikey: 'mychain', address: ADDRESS, page: '2' }).send({ page: '5', offset: '10' }).expect(200);

        expect(db.getEtherscanTransactions).toHaveBeenCalledWith(7, expect.objectContaining({ page: 2, offset: 10 }));
    });

    it('Should return the empty envelope when there are no transactions', async () => {
        db.getEtherscanTransactions.mockResolvedValue([]);

        const { body } = await call({ module: 'account', action: 'txlist', address: ADDRESS }).expect(200);

        expect(body).toEqual({ status: '0', message: 'No transactions found', result: [] });
    });

    it('Should report failed and receipt-less transactions', async () => {
        db.getEtherscanTransactions.mockResolvedValue([
            row({ status: false }),
            row({ receiptId: null, status: null, gasUsed: null, cumulativeGasUsed: null, to: null, contractAddress: null, methodSignature: null, input: '0x' }),
            row({ contractAddress: '0xABCDEF0000000000000000000000000000000000', input: null })
        ]);
        db.getLatestIndexedBlock.mockResolvedValue(null);

        const { body } = await call({ module: 'account', action: 'txlist', address: ADDRESS }).expect(200);

        expect(body.result[0]).toMatchObject({ isError: '1', txreceipt_status: '0' });
        expect(body.result[1]).toMatchObject({ isError: '0', txreceipt_status: '', to: '', gasUsed: '', cumulativeGasUsed: '', methodId: '0x', functionName: '', confirmations: '' });
        expect(body.result[2]).toMatchObject({ contractAddress: '0xabcdef0000000000000000000000000000000000', input: '', methodId: '0x' });
    });

    it.each([
        ['page=0', { page: '0' }],
        ['page=abc', { page: 'abc' }],
        ['page=1.5', { page: '1.5' }],
        ['page=-1', { page: '-1' }],
        ['offset=0', { offset: '0' }],
        ['offset=1001', { offset: '1001' }],
        ['offset=abc', { offset: 'abc' }]
    ])('Should reject %s', async (_label, extra) => {
        const { body } = await call({ module: 'account', action: 'txlist', address: ADDRESS, ...extra }).expect(200);

        expect(body).toEqual(NOTOK('Invalid page or offset'));
        expect(db.getEtherscanTransactions).not.toHaveBeenCalled();
    });

    it('Should reject array and object parameters instead of using the defaults', async () => {
        expect((await request.get('/api?module=account&action=txlist&apikey=mychain&address=' + ADDRESS + '&page[]=1&page[]=2').expect(200)).body).toEqual(NOTOK('Invalid page or offset'));
        expect((await request.get('/api?module=account&action=txlist&apikey=mychain&address=' + ADDRESS + '&sort[a]=desc').expect(200)).body).toEqual(NOTOK(`Invalid sort value. Use 'asc' or 'desc'`));
        expect(db.getEtherscanTransactions).not.toHaveBeenCalled();
    });

    it('Should treat empty optional parameters as absent', async () => {
        db.getEtherscanTransactions.mockResolvedValue([]);

        await call({ module: 'account', action: 'txlist', address: ADDRESS, page: '', offset: '', sort: '', startblock: '', endblock: '' }).expect(200);

        expect(db.getEtherscanTransactions).toHaveBeenCalledWith(7, { address: LOWER, startBlock: 0, endBlock: 2147483647, sort: 'asc', page: 1, offset: 100 });
    });

    it('Should enforce page x offset <= 10000', async () => {
        db.getEtherscanTransactions.mockResolvedValue([]);
        const message = 'Result window is too large, PageNo x Offset size must be less than or equal to 10000';

        expect((await call({ module: 'account', action: 'txlist', address: ADDRESS, page: '11', offset: '1000' }).expect(200)).body).toEqual(NOTOK(message));
        expect((await call({ module: 'account', action: 'txlist', address: ADDRESS, page: '10001', offset: '1' }).expect(200)).body).toEqual(NOTOK(message));
        expect((await call({ module: 'account', action: 'txlist', address: ADDRESS, page: '10', offset: '1000' }).expect(200)).body.message).toBe('No transactions found');
        expect((await call({ module: 'account', action: 'txlist', address: ADDRESS, page: '10000', offset: '1' }).expect(200)).body.message).toBe('No transactions found');
    });

    it('Should reject an invalid sort, block range or address', async () => {
        expect((await call({ module: 'account', action: 'txlist', address: ADDRESS, sort: 'up' }).expect(200)).body).toEqual(NOTOK(`Invalid sort value. Use 'asc' or 'desc'`));
        expect((await call({ module: 'account', action: 'txlist', address: ADDRESS, startblock: '-1' }).expect(200)).body).toEqual(NOTOK('Invalid startblock or endblock'));
        expect((await call({ module: 'account', action: 'txlist', address: ADDRESS, endblock: 'latest' }).expect(200)).body).toEqual(NOTOK('Invalid startblock or endblock'));
        expect((await call({ module: 'account', action: 'txlist', address: 'xyz' }).expect(200)).body).toEqual(NOTOK('Invalid address format'));
    });
});

describe('transaction/getstatus', () => {
    it('Should report a successful execution', async () => {
        db.getEtherscanTransactionStatus.mockResolvedValue({ id: 1, parsedError: null, receiptId: 2, status: true });

        const { body } = await call({ module: 'transaction', action: 'getstatus', txhash: HASH.toUpperCase().replace('0X', '0x') }).expect(200);

        expect(body).toEqual(OK({ isError: '0', errDescription: '' }));
        expect(db.getEtherscanTransactionStatus).toHaveBeenCalledWith(7, HASH);
    });

    it('Should report a failed execution with the stored error', async () => {
        db.getEtherscanTransactionStatus.mockResolvedValue({ id: 1, parsedError: 'Reverted: nope', receiptId: 2, status: false });

        const { body } = await call({ module: 'transaction', action: 'getstatus', txhash: HASH }).expect(200);

        expect(body).toEqual(OK({ isError: '1', errDescription: 'Reverted: nope' }));
    });

    it('Should not flag a transaction without receipt as failed', async () => {
        db.getEtherscanTransactionStatus.mockResolvedValue({ id: 1, parsedError: null, receiptId: null, status: null });

        const { body } = await call({ module: 'transaction', action: 'getstatus', txhash: HASH }).expect(200);

        expect(body).toEqual(OK({ isError: '0', errDescription: '' }));
    });

    it('Should return an error for an unknown transaction or an invalid hash', async () => {
        db.getEtherscanTransactionStatus.mockResolvedValue(null);

        expect((await call({ module: 'transaction', action: 'getstatus', txhash: HASH }).expect(200)).body).toEqual(NOTOK('Transaction not found'));
        expect((await call({ module: 'transaction', action: 'getstatus', txhash: '0x12' }).expect(200)).body).toEqual(NOTOK('Invalid transaction hash format'));
        expect((await call({ module: 'transaction', action: 'getstatus' }).expect(200)).body).toEqual(NOTOK('Invalid transaction hash format'));
    });
});

describe('transaction/gettxreceiptstatus', () => {
    it.each([
        [{ receiptId: 2, status: true }, '1'],
        [{ receiptId: 2, status: false }, '0'],
        [{ receiptId: null, status: null }, ''],
        [{ receiptId: 2, status: null }, '']
    ])('Should map %j to "%s"', async (row, expected) => {
        db.getEtherscanTransactionStatus.mockResolvedValue({ id: 1, parsedError: null, ...row });

        const { body } = await call({ module: 'transaction', action: 'gettxreceiptstatus', txhash: HASH }).expect(200);

        expect(body).toEqual(OK({ status: expected }));
    });

    it('Should return an error for an unknown transaction', async () => {
        db.getEtherscanTransactionStatus.mockResolvedValue(null);

        const { body } = await call({ module: 'transaction', action: 'gettxreceiptstatus', txhash: HASH }).expect(200);

        expect(body).toEqual(NOTOK('Transaction not found'));
    });
});

describe('block/getblocknumberbytime', () => {
    it('Should return the block number as a string', async () => {
        db.getClosestBlockNumber.mockResolvedValue(501);

        const { body } = await call({ module: 'block', action: 'getblocknumberbytime', timestamp: '1767266601', closest: 'before' }).expect(200);

        expect(body).toEqual(OK('501'));
        expect(db.getClosestBlockNumber).toHaveBeenCalledWith(7, 1767266601, 'before');
    });

    it('Should accept closest=after and block number 0', async () => {
        db.getClosestBlockNumber.mockResolvedValue(0);

        const { body } = await call({ module: 'block', action: 'getblocknumberbytime', timestamp: '1', closest: 'after' }).expect(200);

        expect(body).toEqual(OK('0'));
    });

    it('Should return an error when there is no such block', async () => {
        db.getClosestBlockNumber.mockResolvedValue(null);

        const { body } = await call({ module: 'block', action: 'getblocknumberbytime', timestamp: '1', closest: 'before' }).expect(200);

        expect(body).toEqual(NOTOK('No closest block found'));
    });

    it('Should validate its parameters', async () => {
        expect((await call({ module: 'block', action: 'getblocknumberbytime', timestamp: 'abc', closest: 'before' }).expect(200)).body).toEqual(NOTOK('Invalid timestamp'));
        expect((await call({ module: 'block', action: 'getblocknumberbytime', closest: 'before' }).expect(200)).body).toEqual(NOTOK('Invalid timestamp'));
        expect((await call({ module: 'block', action: 'getblocknumberbytime', timestamp: '1', closest: 'near' }).expect(200)).body).toEqual(NOTOK(`Invalid closest value. Use 'before' or 'after'`));
        expect((await call({ module: 'block', action: 'getblocknumberbytime', timestamp: '1' }).expect(200)).body).toEqual(NOTOK(`Invalid closest value. Use 'before' or 'after'`));
    });
});

describe('logs/getLogs', () => {
    const TOPIC0 = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';
    const logRow = (overrides = {}) => ({
        address: LOWER, topics: [TOPIC0, '0x' + '00'.repeat(32)], data: '0x' + '00'.repeat(32), blockNumber: 100, logIndex: 0, transactionHash: HASH,
        transactionIndex: 3, timeStamp: '1767265600', gasPrice: '1000000000', gasUsed: '21000', ...overrides
    });

    it('Should return the exact Etherscan fields with hex quantities', async () => {
        db.getEtherscanLogs.mockResolvedValue([logRow()]);

        const { body } = await call({ module: 'logs', action: 'getLogs', address: ADDRESS, fromBlock: '100', toBlock: '200' }).expect(200);

        expect(body).toEqual(OK([{
            address: LOWER,
            topics: [TOPIC0, '0x' + '00'.repeat(32)],
            data: '0x' + '00'.repeat(32),
            blockNumber: '0x64',
            timeStamp: '0x69565540',
            gasPrice: '0x3b9aca00',
            gasUsed: '0x5208',
            logIndex: '0x0',
            transactionHash: HASH,
            transactionIndex: '0x3'
        }]));
    });

    it('Should leave unavailable values empty and never omit fields', async () => {
        db.getEtherscanLogs.mockResolvedValue([logRow({ timeStamp: null, gasPrice: null, gasUsed: null, data: null, topics: null })]);

        const { body } = await call({ module: 'logs', action: 'getLogs', address: ADDRESS, fromBlock: '1', toBlock: '2' }).expect(200);

        expect(body.result[0]).toMatchObject({ timeStamp: '', gasPrice: '', gasUsed: '', data: '0x', topics: [] });
        expect(Object.keys(body.result[0])).toEqual(['address', 'topics', 'data', 'blockNumber', 'timeStamp', 'gasPrice', 'gasUsed', 'logIndex', 'transactionHash', 'transactionIndex']);
    });

    it('Should pass lowercase topics, sort and pagination to the query', async () => {
        db.getEtherscanLogs.mockResolvedValue([]);

        await call({ module: 'logs', action: 'getLogs', address: ADDRESS, fromBlock: '100', toBlock: '10100', topic0: TOPIC0.toUpperCase().replace('0X', '0x'), topic2: '0x' + 'AA'.repeat(32), sort: 'desc', page: '2', offset: '10' }).expect(200);

        expect(db.getEtherscanLogs).toHaveBeenCalledWith(7, {
            address: LOWER, fromBlock: 100, toBlock: 10100, topics: [TOPIC0, null, '0x' + 'aa'.repeat(32), null], sort: 'desc', page: 2, offset: 10
        });
    });

    it('Should return the empty envelope when no log matches', async () => {
        db.getEtherscanLogs.mockResolvedValue([]);

        const { body } = await call({ module: 'logs', action: 'getLogs', address: ADDRESS, fromBlock: '1', toBlock: '2' }).expect(200);

        expect(body).toEqual({ status: '0', message: 'No records found', result: [] });
    });

    it('Should enforce toBlock - fromBlock <= 10000', async () => {
        db.getEtherscanLogs.mockResolvedValue([]);

        expect((await call({ module: 'logs', action: 'getLogs', address: ADDRESS, fromBlock: '0', toBlock: '10001' }).expect(200)).body)
            .toEqual(NOTOK('Block range is too large, toBlock - fromBlock must be less than or equal to 10000'));
        expect((await call({ module: 'logs', action: 'getLogs', address: ADDRESS, fromBlock: '0', toBlock: '10000' }).expect(200)).body.message).toBe('No records found');
    });

    it('Should validate its parameters', async () => {
        expect((await call({ module: 'logs', action: 'getLogs', fromBlock: '1', toBlock: '2' }).expect(200)).body).toEqual(NOTOK('Invalid address format'));
        expect((await call({ module: 'logs', action: 'getLogs', address: ADDRESS, toBlock: '2' }).expect(200)).body).toEqual(NOTOK('Invalid fromBlock or toBlock'));
        expect((await call({ module: 'logs', action: 'getLogs', address: ADDRESS, fromBlock: '1' }).expect(200)).body).toEqual(NOTOK('Invalid fromBlock or toBlock'));
        expect((await call({ module: 'logs', action: 'getLogs', address: ADDRESS, fromBlock: 'a', toBlock: '2' }).expect(200)).body).toEqual(NOTOK('Invalid fromBlock or toBlock'));
        expect((await call({ module: 'logs', action: 'getLogs', address: ADDRESS, fromBlock: '5', toBlock: '2' }).expect(200)).body)
            .toEqual(NOTOK('Invalid block range, toBlock must be greater than or equal to fromBlock'));
        expect((await call({ module: 'logs', action: 'getLogs', address: ADDRESS, fromBlock: '1', toBlock: '2', topic0: '0x12' }).expect(200)).body).toEqual(NOTOK('Invalid topic format'));
        expect((await call({ module: 'logs', action: 'getLogs', address: ADDRESS, fromBlock: '1', toBlock: '2', page: '11', offset: '1000' }).expect(200)).body.result)
            .toBe('Result window is too large, PageNo x Offset size must be less than or equal to 10000');
        expect(db.getEtherscanLogs).not.toHaveBeenCalled();
    });
});

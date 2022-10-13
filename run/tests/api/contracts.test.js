require('../mocks/models');
require('../mocks/lib/firebase');
require('../mocks/lib/crypto');
require('../mocks/lib/processContractVerification');
require('../mocks/middlewares/workspaceAuth');
require('../mocks/middlewares/auth');
const db = require('../../lib/firebase');
const processContractVerification = require('../../lib/processContractVerification');

const supertest = require('supertest');
const app = require('../../app');
const request = supertest(app);

const BASE_URL = '/api/contracts';

describe(`GET ${BASE_URL}/processable`, () => {
    beforeEach(() => jest.clearAllMocks());

    it('Should return contracts with 200 status code', (done) => {
        jest.spyOn(db, 'getUnprocessedContracts').mockResolvedValue([{ address: '0x123' }]);
        request.get(`${BASE_URL}/processable?firebaseUserId=123&workspace=My+Workspace`)
            .expect(200)
            .then(({ body }) => {
                expect(body).toEqual([{ address: '0x123' }]);
                expect(db.getUnprocessedContracts).toHaveBeenCalledWith('123', 'My Workspace');
                done();
            });
    });
});

describe(`POST ${BASE_URL}/:address`, () => {
    beforeEach(() => jest.clearAllMocks());

    it('Should store contract data and return 200 status code', (done) => {
        db.canUserSyncContract.mockResolvedValue(true);
        request.post(`${BASE_URL}/0x123`)
            .send({ data: { workspace: 'My Workspace', address: '0x123', name: 'My Contract', invalid: 'data', abi: null }})
            .expect(200)
            .then(() => {
                expect(db.storeContractData).toHaveBeenCalledWith('123', 'My Workspace', '0x123', {
                    address: '0x123',
                    name: 'My Contract'
                });
                done();
            });
    });

    it('Should fail with an error message if user cannot sync', (done) => {
        db.canUserSyncContract.mockResolvedValue(false);
        request.post(`${BASE_URL}/0x123`)
            .send({ data: { workspace: 'My Workspace', address: '0x123', name: 'My Contract', invalid: 'data', abi: null }})
            .expect(400)
            .then(({ text }) => {
                expect(text).toEqual('Free plan users are limited to 10 synced contracts. Upgrade to our Premium plan to sync more.')
                expect(db.storeContractData).not.toHaveBeenCalledWith();
                done();
            });
    });
});

describe(`POST ${BASE_URL}/:address/tokenProperties`, () => {
    beforeEach(() => jest.clearAllMocks());

    it('Should set token properties and return 200 status code', (done) => {
        const properties = {
            patterns: [],
            tokenSymbol: 'ETL',
            tokenDecimals: 18,
            tokenName: 'Ethernal',
            totalSupply: '100000',
            has721Metadata: false,
            has721Enumerable: false
        };
        db.getWorkspaceContract.mockResolvedValue({ patterns: [] });
        request.post(`${BASE_URL}/0x123/tokenProperties`)
            .send({ data: { workspace: 'My Workspace', properties }})
            .expect(200)
            .then(() => {
                expect(db.storeContractData).toHaveBeenCalledWith('123', 'My Workspace', '0x123', {
                    ...properties,
                    processed: true
                });
                done();
            });
    });

    it('Should merge token patterns and return 200 status code', (done) => {
        const properties = {
            patterns: ['erc20', 'proxy']
        };
        db.getWorkspaceContract.mockResolvedValue({ patterns: ['erc20'] });
        request.post(`${BASE_URL}/0x123/tokenProperties`)
            .send({ data: { workspace: 'My Workspace', properties }})
            .expect(200)
            .then(() => {
                expect(db.storeContractData).toHaveBeenCalledWith('123', 'My Workspace', '0x123', {
                    ...properties,
                    processed: true
                });
                done();
            });
    });

    it('Should fail gracefully (200) if the contract does not exists', (done) => {
        db.getWorkspaceContract.mockResolvedValue(null);
        request.post(`${BASE_URL}/0x123/tokenProperties`)
            .send({ data: { workspace: 'My Workspace', tokenProperties: { symbol: 'ETL', decimals: 18, name: 'Ethernal' }}})
            .expect(200)
            .then(({ text }) => {
                expect(text).toEqual(`Couldn't find contract at address 0x123.`)
                expect(db.storeContractData).not.toHaveBeenCalled();
                done();
            });
    });
});

describe(`POST ${BASE_URL}/:address/remove`, () => {
    beforeEach(() => jest.clearAllMocks());

    it('Should return 200 status code', (done) => {
        request.post(`${BASE_URL}/0x123/remove`)
            .send({ data: { workspace: 'My Workspace' }})
            .expect(200)
            .then(() => {
                expect(db.removeContract).toHaveBeenCalledWith('123', 'My Workspace', '0x123');
                done();
            });
    });
});

describe(`POST ${BASE_URL}/:address/verify`, () => {
    beforeEach(() => jest.clearAllMocks());

    it('Should return 200 status code', (done) => {
        jest.spyOn(db, 'getPublicExplorerParamsBySlug').mockResolvedValueOnce({ userId: 1, workspaceId: 1 });
        jest.spyOn(db, 'getContract').mockResolvedValueOnce({ address: '0x123' });
        processContractVerification.mockResolvedValueOnce({ verificationSucceded: true });

        request.post(`${BASE_URL}/0x123/verify`)
            .send({
                explorerSlug: 'ethernal',
                compilerVersion: '0.8.0',
                code: {},
                contractName: 'Ethernal'
            })
            .expect(200)
            .then(() => {
                expect(processContractVerification).toHaveBeenCalledWith(db, {
                    publicExplorerParams: { userId: 1, workspaceId: 1 },
                    contractAddress: '0x123',
                    compilerVersion: '0.8.0',
                    code: {},
                    contractName: 'Ethernal',
                    secret: '123'
                });
                done();
            });
    });

    it('Should return 400 if explorer does not exist', (done) => {
        request.post(`${BASE_URL}/0x123/verify`)
            .send({
                explorerSlug: 'ethernal',
                compilerVersion: '0.8.0',
                code: {},
                contractName: 'Ethernal'
            })
            .expect(400)
            .then(({ text }) => {
                expect(text).toEqual("Could not find explorer, make sure you passed the correct slug.");
                done();
            });
    });

    it('Should return 400 if contract does not exist', (done) => {
        jest.spyOn(db, 'getPublicExplorerParamsBySlug').mockResolvedValueOnce({ userId: 1, workspaceId: 1 });
        request.post(`${BASE_URL}/0x123/verify`)
            .send({
                explorerSlug: 'ethernal',
                compilerVersion: '0.8.0',
                code: {},
                contractName: 'Ethernal'
            })
            .expect(400)
            .then(({ text }) => {
                expect(text).toEqual("Couldn't find contract at address 0x123");
                done();
            });
    });

    it('Should return 400 if contract has already been verified', (done) => {
        jest.spyOn(db, 'getPublicExplorerParamsBySlug').mockResolvedValueOnce({ userId: 1, workspaceId: 1 });
        jest.spyOn(db, 'getContract').mockResolvedValueOnce({ address: '0x123', verificationStatus: 'success' });

        request.post(`${BASE_URL}/0x123/verify`)
            .send({
                explorerSlug: 'ethernal',
                compilerVersion: '0.8.0',
                code: {},
                contractName: 'Ethernal'
            })
            .expect(400)
            .then(({ text }) => {
                expect(text).toEqual('Contract has already been verified.');
                done();
            });
    });

    xit('Should return 400 if contract is already being verified', (done) => {
        jest.spyOn(db, 'getPublicExplorerParamsBySlug').mockResolvedValueOnce({ userId: 1, workspaceId: 1 });
        jest.spyOn(db, 'getContract').mockResolvedValueOnce({ address: '0x123', verificationStatus: 'pending' });

        request.post(`${BASE_URL}/0x123/verify`)
            .send({
                explorerSlug: 'ethernal',
                compilerVersion: '0.8.0',
                code: {},
                contractName: 'Ethernal'
            })
            .expect(400)
            .then(({ text }) => {
                expect(text).toEqual('There already is an ongoing verification for this contract.');
                done();
            });
    });

    it('Should return 400 if verification failed', (done) => {
        jest.spyOn(db, 'getPublicExplorerParamsBySlug').mockResolvedValueOnce({ userId: 1, workspaceId: 1 });
        jest.spyOn(db, 'getContract').mockResolvedValueOnce({ address: '0x123' });
        processContractVerification.mockResolvedValueOnce({ verificationSucceded: false, reason: 'Wrong code' });

        request.post(`${BASE_URL}/0x123/verify`)
            .send({
                explorerSlug: 'ethernal',
                compilerVersion: '0.8.0',
                code: {},
                contractName: 'Ethernal'
            })
            .expect(400)
            .then(({ text }) => {
                expect(text).toEqual('Wrong code');
                done();
            });
    });
});

describe(`GET ${BASE_URL}/:address`, () => {
    beforeEach(() => jest.clearAllMocks());

    it('Should return 200 status code', (done) => {
        jest.spyOn(db, 'getWorkspaceContract').mockResolvedValue({ address: '0x123' });
        request.get(`${BASE_URL}/0x123`)
            .expect(200)
            .then(({ body }) => {
                expect(body).toEqual({ address: '0x123' });
                expect(db.getWorkspaceContract).toHaveBeenCalledWith('123', 'My Workspace', '0x123');
                done();
            });
    });
});

describe(`GET ${BASE_URL}`, () => {
    beforeEach(() => jest.clearAllMocks());

    it('Should return 200 status code', (done) => {
        jest.spyOn(db, 'getWorkspaceContracts').mockResolvedValue({ items: [{ address: '0x123' }], total: 10 });
        request.get(BASE_URL)
            .expect(200)
            .then(({ body }) => {
                expect(body).toEqual({ items: [{ address: '0x123' }], total: 10 });
                expect(db.getWorkspaceContracts).toHaveBeenCalledWith('123', 'My Workspace', undefined, undefined, undefined, undefined, undefined);
                done();
            });
    });
});

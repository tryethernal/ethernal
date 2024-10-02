jest.mock('ioredis');
jest.mock('@sentry/node');
require('../mocks/models');
require('../mocks/lib/queue');
require('../mocks/lib/lock');
require('../mocks/lib/firebase');
require('../mocks/lib/crypto');
require('../mocks/lib/processContractVerification');
require('../mocks/lib/utils');
require('../mocks/middlewares/workspaceAuth');
require('../mocks/middlewares/auth');
const db = require('../../lib/firebase');
const Lock = require('../../lib/lock');
const processContractVerification = require('../../lib/processContractVerification');

const supertest = require('supertest');
const app = require('../../app');
const request = supertest(app);

const BASE_URL = '/api/contracts';

beforeEach(() => jest.clearAllMocks());

describe(`GET ${BASE_URL}/sourceCode`, () => {
    it('Should return if cannot find contract', (done) => {
        jest.spyOn(db, 'getPublicExplorerParamsBySlug').mockResolvedValueOnce({ id: 1, workspaceId: 1 });
        jest.spyOn(db, 'getContractByWorkspaceId')
            .mockResolvedValueOnce(null)
            .mockResolvedValueOnce(null)
            .mockResolvedValueOnce(null)
            .mockResolvedValueOnce(null);

        request.get(`${BASE_URL}/sourceCode?address=0xabc&apikey=1`)
            .expect(200)
            .then(({ body }) => {
                expect(body).toEqual({
                    status: "0",
                    message: "KO",
                });
                done();
            });
    });

    it('Should retry if cannot find contract immediately', (done) => {
        jest.spyOn(db, 'getPublicExplorerParamsBySlug').mockResolvedValueOnce({ id: 1, workspaceId: 1 });
        jest.spyOn(db, 'getContractByWorkspaceId')
            .mockResolvedValueOnce(null)
            .mockResolvedValueOnce(null)
            .mockResolvedValueOnce(null)
            .mockResolvedValueOnce({ id: 1, verification: { sources: [] }});

        request.get(`${BASE_URL}/sourceCode?address=0xabc&apikey=1`)
            .expect(200)
            .then(({ body }) => {
                expect(body).toEqual({
                    status: "0",
                    message: "KO",
                });
                done();
            });
    });

    it('Should throw an error if no explorer', (done) => {
        jest.spyOn(db, 'getPublicExplorerParamsBySlug').mockResolvedValueOnce(null);

        request.get(`${BASE_URL}/sourceCode?address=0xabc&apikey=1`)
            .expect(200)
            .then(({ body }) => {
                expect(body).toEqual({
                    status: "0",
                    message: "OK",
                    result: `Request failed: Could not find explorer. If you are using the apiKey param, make sure it is correct.`
                });
                done();
            });
    });

    it('Should return if contract is not verified', (done) => {
        jest.spyOn(db, 'getPublicExplorerParamsBySlug').mockResolvedValueOnce({ workspaceId: 1 });
        jest.spyOn(db, 'getContractByWorkspaceId').mockResolvedValueOnce({ id: 1 });

        request.get(`${BASE_URL}/sourceCode?address=0xabc&apikey=1`)
            .expect(200)
            .then(({ body }) => {
                expect(body).toEqual({
                    status: "0",
                    message: "KO"
                });
                done();
            });
    });

    it('Should return verification info', (done) => {
        jest.spyOn(db, 'getPublicExplorerParamsBySlug').mockResolvedValueOnce({ workspaceId: 1 });
        jest.spyOn(db, 'getContractByWorkspaceId').mockResolvedValueOnce({
            id: 1,
            abi: 'abi',
            name: 'name',
            verification: {
                sources: [{ content: 'code' }],
                compilerVersion: 'version',
                runs: 1,
                constructorArguments: '1234',
                evmVersion: '1234'
            }
        });

        request.get(`${BASE_URL}/sourceCode?address=0xabc&apikey=1`)
            .expect(200)
            .then(({ body }) => {
                expect(body).toEqual({
                    status: "1",
                    message: "OK",
                    result: [
                        {
                            SourceCode: 'code',
                            ABI: 'abi',
                            ContractName: 'name',
                            CompilerVersion: 'version',
                            OptimizationUsed: "1",
                            Runs: 1,
                            ConstructorArguments: '1234',
                            EVMVersion: '1234'
                        }
                    ]
                });
                done();
            });
    });
});

describe(`POST ${BASE_URL}/verify`, () => {
    it('Should throw an error if no explorer', (done) => {
        jest.spyOn(db, 'getPublicExplorerParamsBySlug').mockResolvedValueOnce(null);

        request.post(`${BASE_URL}/verify`)
            .send({
                sourceCode: 'a',
                contractaddress: '0xabc',
                apikey: 'ethernal',
                compilerversion: '0.8.0',
                constructorArguements: '',
                contractname: 'Ethernal'
            })
            .expect(200)
            .then(({ body }) => {
                expect(body).toEqual({
                    status: "0",
                    message: "OK",
                    result: `Contract verification failed: Could not find explorer. If you are using the apiKey param, make sure it is correct.`
                });
                done();
            });
    });

    it('Should throw an error if no contract', (done) => {
        jest.spyOn(db, 'getPublicExplorerParamsBySlug').mockResolvedValueOnce({ id: 1, workspaceId: 1 });
        jest.spyOn(db, 'getContractByWorkspaceId')
            .mockResolvedValueOnce(null)
            .mockResolvedValueOnce(null)
            .mockResolvedValueOnce(null)
            .mockResolvedValueOnce(null);

        request.post(`${BASE_URL}/verify`)
            .send({
                sourceCode: 'a',
                contractaddress: '0xabc',
                apikey: 'ethernal',
                compilerversion: '0.8.0',
                constructorArguements: '',
                contractname: 'Ethernal'
            })
            .expect(200)
            .then(({ body }) => {
                expect(body).toEqual({
                    status: "0",
                    message: "OK",
                    result: `Contract verification failed: Unable to locate contract. Please try running the verification command again.`
                });
                done();
            });
    });

    it('Should re check if no contract immediately', (done) => {
        jest.spyOn(db, 'getPublicExplorerParamsBySlug').mockResolvedValueOnce({ id: 1, workspaceId: 1 });
        jest.spyOn(db, 'getContractByWorkspaceId')
            .mockResolvedValueOnce(null)
            .mockResolvedValueOnce(null)
            .mockResolvedValueOnce(null)
            .mockResolvedValueOnce({ id: 1, verification: {} });

        request.post(`${BASE_URL}/verify`)
            .send({
                sourceCode: 'a',
                contractaddress: '0xabc',
                apikey: 'ethernal',
                compilerversion: '0.8.0',
                constructorArguements: '',
                contractname: 'Ethernal.sol:Ethernal'
            })
            .expect(200)
            .then(({ body }) => {
                expect(body).toEqual({
                    status: "1",
                    message: "OK",
                    result: "Already Verified"
                });
                done();
            });
    });

    it('Should send back a message if contract already verified', (done) => {
        jest.spyOn(db, 'getPublicExplorerParamsBySlug').mockResolvedValueOnce({ id: 1, workspaceId: 1 });
        jest.spyOn(db, 'getContractByWorkspaceId').mockResolvedValueOnce({ id: 1, verification: {} });

        request.post(`${BASE_URL}/verify`)
            .send({
                sourceCode: 'a',
                contractaddress: '0xabc',
                apikey: 'ethernal',
                compilerversion: '0.8.0',
                constructorArguements: '',
                contractname: 'Ethernal'
            })
            .expect(200)
            .then(({ body }) => {
                expect(body).toEqual({
                    status: "1",
                    message: "OK",
                    result: `Already Verified`
                });
                done();
            });
    });

    it('Should throw an error if contract name has an invalid format', (done) => {
        jest.spyOn(db, 'getPublicExplorerParamsBySlug').mockResolvedValueOnce({ id: 1, workspaceId: 1 });
        jest.spyOn(db, 'getContractByWorkspaceId').mockResolvedValueOnce({ id: 1 });

        request.post(`${BASE_URL}/verify`)
            .send({
                sourceCode: 'a',
                contractaddress: '0xabc',
                apikey: 'ethernal',
                compilerversion: '0.8.0',
                constructorArguements: '',
                contractname: 'Ethernal'
            })
            .expect(200)
            .then(({ body }) => {
                expect(body).toEqual({
                    status: "0",
                    message: "OK",
                    result: `Contract verification failed: Invalid contract name format.`
                });
                done();
            });
    });

    it('Should throw an error if the contract is being verified', (done) => {
        jest.spyOn(db, 'getPublicExplorerParamsBySlug').mockResolvedValueOnce({ id: 1, workspaceId: 1 });
        jest.spyOn(db, 'getContractByWorkspaceId').mockResolvedValueOnce({ id: 1 });
        Lock.mockImplementationOnce(() => ({
            acquire: jest.fn().mockResolvedValue(false)
        }));

        request.post(`${BASE_URL}/verify`)
            .send({
                sourceCode: 'a',
                contractaddress: '0xabc',
                apikey: 'ethernal',
                compilerversion: '0.8.0',
                constructorArguements: '',
                contractname: 'Ethernal.sol:Ethernal'
            })
            .expect(200)
            .then(({ body }) => {
                expect(body).toEqual({
                    status: "0",
                    message: "OK",
                    result: `Contract verification failed: There is already an ongoing verification for this contract.`
                });
                done();
            });
    });

    it('Should return a success message if contract has been verified successfully', (done) => {
        jest.spyOn(db, 'getPublicExplorerParamsBySlug').mockResolvedValueOnce({ id: 1, workspaceId: 1 });
        jest.spyOn(db, 'getContractByWorkspaceId').mockResolvedValueOnce({ id: 1 });
        Lock.mockImplementationOnce(() => ({
            acquire: jest.fn().mockResolvedValue(true),
            release: jest.fn().mockResolvedValue(true)
        }));
        processContractVerification.mockResolvedValueOnce({ verificationSucceded: true });

        request.post(`${BASE_URL}/verify`)
            .send({
                sourceCode: JSON.stringify({ sources: {}, settings: {} }),
                contractaddress: '0xabc',
                apikey: 'ethernal',
                compilerversion: '0.8.0',
                constructorArguements: '',
                contractname: 'Ethernal.sol:Ethernal'
            })
            .expect(200)
            .then(({ body }) => {
                expect(body).toEqual({
                    status: "1",
                    message: "OK",
                    result: `1234`
                });
                done();
            });
    });
});

describe(`GET ${BASE_URL}/:address/stats`, () => {
    it('Should return stats with 200 status code', (done) => {
        jest.spyOn(db, 'getTokenStats').mockResolvedValue({ total: 1, items: [{ address: 'Ox123' }]});
        request.get(`${BASE_URL}/0x123/stats?workspace=My+Workspace`)
            .expect(200)
            .then(({ body }) => {
                expect(body).toEqual({ total: 1, items: [{ address: 'Ox123' }]});
                done();
            });
    });
});

describe(`GET ${BASE_URL}/:address/logs`, () => {
    it('Should fail if no contract at address', (done) => {
        jest.spyOn(db, 'getContractLogs').mockResolvedValueOnce({ total: 0, items: [] });
        request.get(`${BASE_URL}/0x123/logs?signature=0x456&firebaseUserId=123&workspace=My+Workspace`)
            .expect(200)
            .then(({ body }) => {
                expect(body).toEqual({ total: 0, items: []});
                done();
            });
    });

    it('Should return logs with 200 status code', (done) => {
        jest.spyOn(db, 'getContractLogs').mockResolvedValue({ total: 1, items: [{ address: 'Ox123' }]});
        request.get(`${BASE_URL}/0x123/logs?signature=0x456&firebaseUserId=123&workspace=My+Workspace`)
            .expect(200)
            .then(({ body }) => {
                expect(body).toEqual({ total: 1, items: [{ address: 'Ox123' }]});
                done();
            });
    });
});

describe(`POST ${BASE_URL}/:address/watchedPaths`, () => {
    it('Should update the watchedPaths field', (done) => {
        request.post(`${BASE_URL}/0x123/watchedPaths`)
            .send({ data: { workspace: 'My Workspace', address: '0x123', watchedPaths: JSON.stringify([]) }})
            .expect(200)
            .then(() => {
                expect(db.storeContractData).toHaveBeenCalledWith('123', 'My Workspace', '0x123', {
                    watchedPaths: "[]"
                });
                done();
            });
    });
});

describe(`GET ${BASE_URL}/processable`, () => {
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
        db.getWorkspaceByName.mockResolvedValue({ id: 1 });
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
        db.getWorkspaceByName.mockResolvedValue({ id: 1 });
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

    it('Should fail if the contract does not exists', (done) => {
        db.getWorkspaceByName.mockResolvedValue({ id: 1 });
        db.getWorkspaceContract.mockResolvedValue(null);
        request.post(`${BASE_URL}/0x123/tokenProperties`)
            .send({ data: { workspace: 'My Workspace', tokenProperties: { symbol: 'ETL', decimals: 18, name: 'Ethernal' }}})
            .expect(400)
            .then(({ text }) => {
                expect(text).toEqual(`Could not find contract at this address.`)
                expect(db.storeContractData).not.toHaveBeenCalled();
                done();
            });
    });
});

describe(`POST ${BASE_URL}/:address/remove`, () => {
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
                    contractName: 'Ethernal'
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

    it.skip('Should return 400 if contract has already been verified', (done) => {
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
    it('Should return 200 status code', (done) => {
        jest.spyOn(db, 'getWorkspaceContract').mockResolvedValue({ address: '0x123' });
        request.get(`${BASE_URL}/0x123`)
            .expect(200)
            .then(({ body }) => {
                expect(body).toEqual({ address: '0x123' });
                expect(db.getWorkspaceContract).toHaveBeenCalledWith(1, '0x123');
                done();
            });
    });
});

describe(`GET ${BASE_URL}`, () => {
    it('Should return 200 status code', (done) => {
        jest.spyOn(db, 'getWorkspaceContracts').mockResolvedValue({ items: [{ address: '0x123' }], total: 10 });
        request.get(BASE_URL)
            .expect(200)
            .then(({ body }) => {
                expect(body).toEqual({ items: [{ address: '0x123' }], total: 10 });
                expect(db.getWorkspaceContracts).toHaveBeenCalledWith(1, undefined, undefined, undefined, undefined, undefined);
                done();
            });
    });
});

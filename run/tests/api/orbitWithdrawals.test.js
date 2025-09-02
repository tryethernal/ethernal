require('../mocks/models');
require('../mocks/lib/firebase');
require('../mocks/lib/env');
require('../mocks/middlewares/workspaceAuth');
require('../mocks/middlewares/auth');
require('../mocks/middlewares/browserSync');
require('../mocks/lib/errors');
require('../mocks/lib/orbitWithdrawals');
const db = require('../../lib/firebase');
const { unmanagedError, managedError } = require('../../lib/errors');
const { getClaimTransactionData } = require('../../lib/orbitWithdrawals');

const supertest = require('supertest');
const app = require('../../app');
const request = supertest(app);

const BASE_URL = '/api/orbitWithdrawals';

beforeEach(() => {
    jest.clearAllMocks();

    managedError.mockImplementation((error, req, res) => {
        res.status(400).send(error.message);
    });
    
    // Mock unmanagedError to call next(error) to trigger error handling middleware
    unmanagedError.mockImplementation((error, req, next) => {
        if (next && typeof next === 'function') {
            next(error);
        }
    });
});

describe(`GET ${BASE_URL}/:hash/claimCalldata`, () => {
    const mockTransaction = {
        workspace: {
            id: 1,
            orbitConfig: {
                outboxContract: '0x1234567890abcdef',
                parentChainRpcServer: 'https://rpc.example.com',
                parentChainId: 1
            },
            getOrbitLatestConfirmedBlock: jest.fn()
        }
    };

    const mockLog = {
        topics: ['0x123'],
        data: '0x456'
    };

    beforeEach(() => {
        mockTransaction.workspace.getOrbitLatestConfirmedBlock.mockResolvedValue({
            sendCount: 100
        });
    });

    it('Should return claim calldata with transaction details', (done) => {
        const mockCallData = '0xabcdef123456';
        jest.spyOn(db, 'getL2TransactionForOrbitWithdrawalClaim').mockResolvedValue({
            log: mockLog,
            transaction: mockTransaction
        });
        getClaimTransactionData.mockResolvedValue(mockCallData);

        request.get(`${BASE_URL}/0x123/claimCalldata`)
            .query({ messageNumber: 5 })
            .expect(200)
            .then(({ body }) => {
                expect(body).toEqual({
                    callData: mockCallData,
                    to: '0x1234567890abcdef',
                    l1RpcServer: 'https://rpc.example.com',
                    l1ChainId: 1
                });
                expect(db.getL2TransactionForOrbitWithdrawalClaim).toHaveBeenCalledWith(1, '0x123', '5');
                expect(mockTransaction.workspace.getOrbitLatestConfirmedBlock).toHaveBeenCalled();
                expect(getClaimTransactionData).toHaveBeenCalledWith('5', 100, mockTransaction, mockLog);
                done();
            });
    });

    it('Should handle missing messageNumber parameter', (done) => {
        request.get(`${BASE_URL}/0x123/claimCalldata`)
            .expect(400)
            .then(({ text }) => {
                expect(text).toEqual('Missing parameters');
                done();
            });
    });
});

describe(`GET ${BASE_URL}/:hash`, () => {
    it('Should return orbit withdrawals for a specific hash', (done) => {
        const mockWithdrawals = [
            { id: 1, hash: '0x123', amount: '1000000000000000000' },
            { id: 2, hash: '0x123', amount: '2000000000000000000' }
        ];
        jest.spyOn(db, 'getL2TransactionOrbitWithdrawals').mockResolvedValue({
            count: 2,
            rows: mockWithdrawals
        });

        request.get(`${BASE_URL}/0x123`)
            .expect(200)
            .then(({ body }) => {
                expect(body).toEqual({
                    items: mockWithdrawals,
                    total: 2
                });
                expect(db.getL2TransactionOrbitWithdrawals).toHaveBeenCalledWith(1, '0x123');
                done();
            });
    });

    it('Should handle empty results for hash', (done) => {
        jest.spyOn(db, 'getL2TransactionOrbitWithdrawals').mockResolvedValue({
            count: 0,
            rows: []
        });

        request.get(`${BASE_URL}/0x123`)
            .expect(200)
            .then(({ body }) => {
                expect(body).toEqual({
                    items: [],
                    total: 0
                });
                done();
            });
    });

    it('Should handle invalid hash format', (done) => {
        jest.spyOn(db, 'getL2TransactionOrbitWithdrawals').mockResolvedValue({
            count: 0,
            rows: []
        });

        request.get(`${BASE_URL}/invalid-hash`)
            .expect(200)
            .then(({ body }) => {
                expect(body).toEqual({
                    items: [],
                    total: 0
                });
                expect(db.getL2TransactionOrbitWithdrawals).toHaveBeenCalledWith(1, 'invalid-hash');
                done();
            });
    });
});

describe(`GET ${BASE_URL}`, () => {
    it('Should return paginated orbit withdrawals', (done) => {
        const mockWithdrawals = [
            { id: 1, hash: '0x123', amount: '1000000000000000000' },
            { id: 2, hash: '0x456', amount: '2000000000000000000' }
        ];
        jest.spyOn(db, 'getWorkspaceOrbitWithdrawals').mockResolvedValue({
            count: 2,
            rows: mockWithdrawals
        });

        request.get(BASE_URL)
            .expect(200)
            .then(({ body }) => {
                expect(body).toEqual({
                    items: mockWithdrawals,
                    total: 2
                });
                expect(db.getWorkspaceOrbitWithdrawals).toHaveBeenCalledWith(1, undefined, undefined, undefined);
                done();
            });
    });

    it('Should pass query parameters to database function', (done) => {
        const mockWithdrawals = [{ id: 1, hash: '0x123', amount: '1000000000000000000' }];
        jest.spyOn(db, 'getWorkspaceOrbitWithdrawals').mockResolvedValue({
            count: 1,
            rows: mockWithdrawals
        });

        request.get(BASE_URL)
            .query({ page: 2, itemsPerPage: 10, order: 'desc' })
            .expect(200)
            .then(({ body }) => {
                expect(body).toEqual({
                    items: mockWithdrawals,
                    total: 1
                });
                expect(db.getWorkspaceOrbitWithdrawals).toHaveBeenCalledWith(1, '2', '10', 'desc');
                done();
            });
    });

    it('Should handle empty results', (done) => {
        jest.spyOn(db, 'getWorkspaceOrbitWithdrawals').mockResolvedValue({
            count: 0,
            rows: []
        });

        request.get(BASE_URL)
            .expect(200)
            .then(({ body }) => {
                expect(body).toEqual({
                    items: [],
                    total: 0
                });
                done();
            });
    });

    it('Should handle invalid query parameters', (done) => {
        const mockWithdrawals = [{ id: 1, hash: '0x123', amount: '1000000000000000000' }];
        jest.spyOn(db, 'getWorkspaceOrbitWithdrawals').mockResolvedValue({
            count: 1,
            rows: mockWithdrawals
        });

        request.get(BASE_URL)
            .query({ page: 'invalid', itemsPerPage: 'not-a-number', order: 'invalid' })
            .expect(200)
            .then(({ body }) => {
                expect(body).toEqual({
                    items: mockWithdrawals,
                    total: 1
                });
                expect(db.getWorkspaceOrbitWithdrawals).toHaveBeenCalledWith(1, 'invalid', 'not-a-number', 'invalid');
                done();
            });
    });

    it('Should handle large page numbers', (done) => {
        const mockWithdrawals = [];
        jest.spyOn(db, 'getWorkspaceOrbitWithdrawals').mockResolvedValue({
            count: 0,
            rows: mockWithdrawals
        });

        request.get(BASE_URL)
            .query({ page: 999999, itemsPerPage: 1000 })
            .expect(200)
            .then(({ body }) => {
                expect(body).toEqual({
                    items: [],
                    total: 0
                });
                expect(db.getWorkspaceOrbitWithdrawals).toHaveBeenCalledWith(1, '999999', '1000', undefined);
                done();
            });
    });

    it('Should handle special characters in order parameter', (done) => {
        const mockWithdrawals = [{ id: 1, hash: '0x123', amount: '1000000000000000000' }];
        jest.spyOn(db, 'getWorkspaceOrbitWithdrawals').mockResolvedValue({
            count: 1,
            rows: mockWithdrawals
        });

        request.get(BASE_URL)
            .query({ order: 'asc; DROP TABLE users; --' })
            .expect(200)
            .then(({ body }) => {
                expect(body).toEqual({
                    items: mockWithdrawals,
                    total: 1
                });
                expect(db.getWorkspaceOrbitWithdrawals).toHaveBeenCalledWith(1, undefined, undefined, 'asc; DROP TABLE users; --');
                done();
            });
    });
});

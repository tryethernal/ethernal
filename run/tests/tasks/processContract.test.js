jest.mock('axios', () => ({
    get: jest.fn().mockResolvedValue({
        data: {
            message: 'OK',
            result: [
                { ContractName: 'Contract', ABI: JSON.stringify({ my: 'function' })}
            ],
            Proxy: '0'
        }
    })
}));
require('../mocks/lib/ethers');
require('../mocks/lib/utils');
require('../mocks/lib/firebase');
require('../mocks/lib/transactions');
require('../mocks/middlewares/taskAuth');
require('../mocks/lib/pusher');

const axios = require('axios');
const db = require('../../lib/firebase');
const transactionsLib = require('../../lib/transactions');

const supertest = require('supertest');
const app = require('../../app');
const request = supertest(app);

const BASE_URL = '/tasks/contractProcessing';

afterEach(() => jest.clearAllMocks());

describe('POST /', () => {
    jest.spyOn(db, 'getWorkspaceById').mockResolvedValue({ id: 1, name: 'My Workspace' });
    jest.spyOn(db, 'getUserById').mockResolvedValue({ id: 1, firebaseUserId: '123' });
    jest.spyOn(db, 'getWorkspaceContractById').mockResolvedValue({ workspaceId: 1, address: '0x123' });
    jest.spyOn(db, 'getContractByHashedBytecode').mockResolvedValue(null);

    it('Should return a 200 without any processing if contract is not found', (done) => {
        jest.spyOn(db, 'getWorkspaceContractById').mockResolvedValueOnce(null);
        request.post(BASE_URL)
            .send({ data: {
                workspaceId: 1,
                contractId: 2
            }})
            .expect(200)
            .then(() => {
                expect(db.getUserById).not.toHaveBeenCalled();
                done();
            });
    });

    it('Should try to find metadata from scanner if it cannot find everything locally', (done) => {
        request.post(BASE_URL)
            .send({ data: {
                workspaceId: 1,
                contractId: 2
            }})
            .expect(200)
            .then(() => {
                expect(db.storeContractData).toHaveBeenCalledWith('123', 'My Workspace', '0x123', { name: 'Contract', abi: { my: 'function' }});
                done();
            });
    });

    it('Should get proxy contract if applicable', (done) => {
        jest.spyOn(axios, 'get').mockResolvedValueOnce({
            data: {
                message: 'OK',
                result: [
                    { ContractName: 'Contract', Proxy: '1', Implementation: '0x456', ABI: JSON.stringify({ my: 'function' })}
                ]
            }
        });

        request.post(BASE_URL)
            .send({ data: {
                workspaceId: 1,
                contractId: 2
            }})
            .expect(200)
            .then(() => {
                expect(db.storeContractData).toHaveBeenCalledWith('123', 'My Workspace', '0x456', { address: '0x456' });
                expect(db.storeContractData).toHaveBeenCalledWith('123', 'My Workspace', '0x123', { name: 'Contract', proxy: '0x456', abi: { my: 'function' }});
                done();
            });
    });

    it('Should fetch & store contract info as proxy if the workspace is public', (done) => {
        jest.spyOn(db, 'getWorkspaceById').mockResolvedValueOnce({ id: 1, name: 'My Workspace', public: true });
        jest.spyOn(db, 'getWorkspaceContractById').mockResolvedValue({ workspaceId: 1, address: '0x123', abi: { my: 'function' }});

        request.post(BASE_URL)
            .send({ data: {
                workspaceId: 1,
                contractId: 2
            }})
            .expect(200)
            .then(() => {
                expect(db.storeContractData).toHaveBeenCalledWith('123', 'My Workspace', '0x123', {
                    patterns: ['erc20', 'proxy'],
                    processed: true,
                    token: {
                        name: 'Ethernal',
                        symbol: 'ETL',
                        decimals: 18
                    }
                });
                done();
            });
    });

    it('Should reprocess all contract transactions', (done) => {
        jest.spyOn(db, 'getContractTransactions').mockResolvedValue([{ hash: '0x123' }, { hash: '0x456' }]);

        request.post(BASE_URL)
            .send({ data: {
                workspaceId: 1,
                contractId: 2
            }})
            .expect(200)
            .then(() => {
                expect(transactionsLib.processTransactions).toHaveBeenCalledWith('123', 'My Workspace', [
                    { hash: '0x123' },
                    { hash: '0x456' }
                ]);
                done();
            });        
    });
});

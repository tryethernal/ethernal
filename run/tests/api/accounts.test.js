require('../mocks/lib/queue');
require('../mocks/models');
require('../mocks/lib/firebase');
require('../mocks/lib/crypto');
require('../mocks/middlewares/auth');
require('../mocks/middlewares/workspaceAuth');
const db = require('../../lib/firebase');

const supertest = require('supertest');
const app = require('../../app');
const request = supertest(app);

const BASE_URL = '/api/accounts';

describe(`GET ${BASE_URL}`, () => {
    beforeEach(() => jest.clearAllMocks());

    it('Should return the list of native accounts', (done) => {
        const mockAccounts = [
            { address: '0x123', balance: '1234567890' },
            { address: '0x456', balance: '9876543210' }
        ];
        jest.spyOn(db, 'getFilteredNativeAccounts').mockResolvedValueOnce(mockAccounts);
        
        request.get(`${BASE_URL}`)
            .query({ page: 1, itemsPerPage: 10 })
            .expect(200)
            .then(({ body }) => {
                expect(body).toEqual({ items: mockAccounts });
                expect(db.getFilteredNativeAccounts).toHaveBeenCalledWith(1, '1', '10');
                done();
            });
    });

    it('Should handle errors gracefully', (done) => {
        const error = new Error('Database error');
        jest.spyOn(db, 'getFilteredNativeAccounts').mockRejectedValueOnce(error);
        
        request.get(`${BASE_URL}`)
            .query({ page: 1, itemsPerPage: 10 })
            .expect(500)
            .then(() => {
                expect(db.getFilteredNativeAccounts).toHaveBeenCalledWith(1, '1', '10');
                done();
            });
    });
});

describe(`GET ${BASE_URL}/imported`, () => {
    beforeEach(() => jest.clearAllMocks());

    it('Should return the list of accounts', (done) => {
        jest.spyOn(db, 'getImportedAccounts').mockResolvedValueOnce([{ address: '0x123', balance: '1234567890' }]);
        request.get(`${BASE_URL}/imported`)
            .expect(200)
            .then(({ body }) => {
                expect(body).toEqual([{ address: '0x123', balance: '1234567890' }]);
                done();
            });
    });
});

describe(`POST ${BASE_URL}/:address/syncBalance`, () => {
    beforeEach(() => jest.clearAllMocks());

    it('Should return 200 status code', (done) => {
        request.post(`${BASE_URL}/123A/syncBalance`)
            .send({ data: { workspace: 'My Workspace', balance: '1234567' }})
            .expect(200)
            .then(() => {
                expect(db.updateAccountBalance).toHaveBeenCalledWith('123', 'My Workspace', '123a', '1234567');
                done();
            });
    });
});

describe(`POST ${BASE_URL}/:address/privateKey`, () => {
    beforeEach(() => jest.clearAllMocks());

    it('Should return 200 status code', (done) => {
        request.post(`${BASE_URL}/123A/privateKey`)
            .send({ data: { workspace: 'My Workspace', privateKey: '1234567' }})
            .expect(200)
            .then(() => {
                expect(db.storeAccountPrivateKey).toHaveBeenCalledWith('123', 'My Workspace', '123a', '1234');
                done();
            });
    });
});

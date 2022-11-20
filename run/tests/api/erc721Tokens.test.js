require('../mocks/lib/firebase');
require('../mocks/middlewares/workspaceAuth');
require('../mocks/lib/queue');
const db = require('../../lib/firebase');
const { enqueue } = require('../../lib/queue');

const supertest = require('supertest');
const app = require('../../app');
const request = supertest(app);

const BASE_URL = '/api/erc721Tokens';

describe(`GET ${BASE_URL}/:address/:tokenId/transfers`, () => {
    beforeEach(() => jest.clearAllMocks());

    it('Should return token transfers', (done) => {
        jest.spyOn(db, 'getErc721TokenTransfers').mockResolvedValueOnce([{
            src: '0x123',
            dst: '0x456',
            tokenId: '1'
        }]);
        request.get(`${BASE_URL}/0x123/0/transfers`)
            .expect(200)
            .then(({ body }) => {
                expect(body).toEqual([{
                    src: '0x123',
                    dst: '0x456',
                    tokenId: '1'
                }]);
                done();
            });
    });
          
});

describe(`POST ${BASE_URL}/:address/:index/reload`, () => {
    beforeEach(() => jest.clearAllMocks());

    it('Should enqueue reload task', (done) => {
        jest.spyOn(db, 'getWorkspaceByName').mockResolvedValueOnce({
            id: 1
        });
        request.post(`${BASE_URL}/0x123/0/reload`)
            .send({ data: { workspace: 'Ethernal' }})
            .expect(200)
            .then(() => {
                expect(enqueue).toHaveBeenCalledWith('reloadErc721Token', expect.anything(), {
                    workspaceId: 1,
                    address: '0x123',
                    tokenId: '0'
                });
                done();
            });
    });
});

describe(`GET ${BASE_URL}/:address/:index`, () => {
    beforeEach(() => jest.clearAllMocks());

    it('Should return token', (done) => {
        jest.spyOn(db, 'getContractErc721Token').mockResolvedValueOnce({
            tokenId: '1'
        });
        request.get(`${BASE_URL}/0x123/0`)
            .expect(200)
            .then(({ body }) => {
                expect(body).toEqual({ tokenId: '1' });
                done();
            });
    });
});

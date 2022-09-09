require('../mocks/lib/firebase');
require('../mocks/middlewares/workspaceAuth');
const db = require('../../lib/firebase');

const supertest = require('supertest');
const app = require('../../app');
const request = supertest(app);

const BASE_URL = '/api/erc721Collections';

describe(`GET ${BASE_URL}/:address/tokens`, () => {
    beforeEach(() => jest.clearAllMocks());

    it('Should return collection tokens', (done) => {
        jest.spyOn(db, 'getContractErc721Tokens').mockResolvedValueOnce({
            total: 1,
            tokens: [{ tokenId: '1' }]
        });
        request.get(`${BASE_URL}/0x123/tokens`)
            .expect(200)
            .then(({ body }) => {
                expect(body).toEqual({ total: 1, tokens: [{ tokenId: '1' }] });
                done();
            });
    });
});

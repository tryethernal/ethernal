require('../mocks/lib/queue');
require('../mocks/lib/firebase');
require('../mocks/lib/rpc');
require('../mocks/middlewares/workspaceAuth');
const db = require('../../lib/firebase');

const { ERC721Connector } = require('../../lib/rpc');

const supertest = require('supertest');
const app = require('../../app');
const request = supertest(app);

const BASE_URL = '/api/erc721Collections';

describe(`GET ${BASE_URL}/:address/totalSupply`, () => {
    beforeEach(() => jest.clearAllMocks());

    it('Should return collection total supply', (done) => {
        ERC721Connector.mockImplementation(() => ({
            totalSupply: jest.fn().mockResolvedValueOnce('10000'),
        }));
        request.get(`${BASE_URL}/0x123/totalSupply`)
            .expect(200)
            .then(({ body }) => {
                expect(body).toEqual({ totalSupply: '10000' });
                done();
            });
    });
});


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

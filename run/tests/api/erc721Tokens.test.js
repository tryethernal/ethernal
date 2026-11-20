const mockAxiosGet = jest.fn();
jest.mock('axios', () => ({
    get: mockAxiosGet
}));
require('../mocks/models');
require('../mocks/lib/firebase');
require('../mocks/middlewares/workspaceAuth');
require('../mocks/lib/queue');
require('../mocks/lib/rpc');
const db = require('../../lib/firebase');
const { enqueue } = require('../../lib/queue');

const supertest = require('supertest');
const app = require('../../app');
const request = supertest(app);

const { ERC721Connector } = require('../../lib/rpc');

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
                expect(body).toEqual({
                    items: [{
                        src: '0x123',
                        dst: '0x456',
                        tokenId: '1'
                    }],
                    total: 1
                });
                done();
            });
    });
          
});

describe(`POST ${BASE_URL}/:address/:index/reload`, () => {
    beforeEach(() => jest.clearAllMocks());

    it('Should enqueue reload task', (done) => {
        jest.spyOn(db, 'getWorkspaceByNameAuth').mockResolvedValueOnce({
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

describe(`GET ${BASE_URL}/:address/tokenIndex/:tokenIndex`, () => {
    beforeEach(() => jest.clearAllMocks());

    it('Should return token info', (done) => {
        ERC721Connector.mockImplementation(() => ({
            tokenByIndex: jest.fn().mockResolvedValueOnce('1'),
            ownerOf: jest.fn().mockResolvedValueOnce('0x1234'),
            tokenURI: jest.fn().mockResolvedValueOnce('ipfs://azertyuiop')
        }));
        mockAxiosGet.mockResolvedValueOnce({
            data: {
                name: 'test',
                description: 'test'
            }
        });
        request.get(`${BASE_URL}/0x123/tokenIndex/0`)
            .expect(200)
            .then(({ body }) => {
                expect(body).toEqual({
                    attributes: { boosts: [], dates: [], description: 'test', levels: [], name: 'test', properties: [], stats: [] },
                    tokenId: '1',
                    owner: '0x1234',
                    URI: 'ipfs://azertyuiop',
                    metadata: {
                        name: 'test',
                        description: 'test'
                    }
                });
                done();
            });
    });

    it('Should return 200 if cannot find tokenId', (done) => {
        ERC721Connector.mockImplementation(() => ({
            tokenByIndex: jest.fn().mockResolvedValueOnce(null),
        }));
        request.get(`${BASE_URL}/0x123/tokenIndex/0`)
            .expect(200)
            .then(() => {
                done();
            });
    });
});

describe('data: URI metadata', () => {
    beforeEach(() => jest.clearAllMocks());

    const dataUri = `data:application/json;base64,${Buffer.from(JSON.stringify({ name: 'On-chain', description: 'desc' })).toString('base64')}`;

    it('Should decode the URI by token index without calling axios', async () => {
        ERC721Connector.mockImplementation(() => ({
            tokenByIndex: jest.fn().mockResolvedValueOnce('1'),
            ownerOf: jest.fn().mockResolvedValueOnce('0x1234'),
            tokenURI: jest.fn().mockResolvedValueOnce(dataUri)
        }));

        const { body } = await request.get(`${BASE_URL}/0x123/tokenIndex/0`).expect(200);

        expect(mockAxiosGet).not.toHaveBeenCalled();
        expect(body.URI).toEqual(dataUri);
        expect(body.metadata).toEqual({ name: 'On-chain', description: 'desc' });
        expect(body.attributes.name).toEqual('On-chain');
    });

    it('Should decode the URI by token id without calling axios', async () => {
        ERC721Connector.mockImplementation(() => ({
            ownerOf: jest.fn().mockResolvedValueOnce('0x1234'),
            tokenURI: jest.fn().mockResolvedValueOnce(dataUri)
        }));

        const { body } = await request.get(`${BASE_URL}/0x123/1`).expect(200);

        expect(mockAxiosGet).not.toHaveBeenCalled();
        expect(body.metadata).toEqual({ name: 'On-chain', description: 'desc' });
        expect(body.attributes.name).toEqual('On-chain');
    });

    it('Should return empty metadata for a malformed data URI', async () => {
        ERC721Connector.mockImplementation(() => ({
            ownerOf: jest.fn().mockResolvedValueOnce('0x1234'),
            tokenURI: jest.fn().mockResolvedValueOnce('data:application/json;base64,bm90IGpzb24=')
        }));

        const { body } = await request.get(`${BASE_URL}/0x123/1`).expect(200);

        expect(mockAxiosGet).not.toHaveBeenCalled();
        expect(body.metadata).toEqual({});
    });

    it('Should still fetch http URIs with axios', async () => {
        ERC721Connector.mockImplementation(() => ({
            ownerOf: jest.fn().mockResolvedValueOnce('0x1234'),
            tokenURI: jest.fn().mockResolvedValueOnce('https://tokenlink/1.json')
        }));
        mockAxiosGet.mockResolvedValueOnce({ data: { name: 'Remote' }});

        const { body } = await request.get(`${BASE_URL}/0x123/1`).expect(200);

        expect(mockAxiosGet).toHaveBeenCalledWith('https://tokenlink/1.json');
        expect(body.metadata).toEqual({ name: 'Remote' });
    });
});

require('../mocks/lib/rpc');
require('../mocks/lib/firebase');
require('../mocks/lib/transactions');
require('../mocks/middlewares/taskAuth');
jest.mock('axios');

const axios = require('axios');

const db = require('../../lib/firebase');
const { ERC721Connector } = require('../../lib/rpc');

const supertest = require('supertest');
const app = require('../../app');
const request = supertest(app);

const BASE_URL = '/tasks/fetchAndStoreErc721Token';

afterAll(() => jest.clearAllMocks());

describe('POST /', () => {
    jest.spyOn(db, 'getWorkspaceById').mockResolvedValue({ id: 1, rpcServer: 'http://localhost:8545' });
    
    it('Should store token data, with fetched metadata', (done) => {
        jest.spyOn(axios, 'get').mockResolvedValue({ data: { name: 'My Cool NFT' }});

        request.post(BASE_URL)
            .send({ data : {
                workspaceId: 1,
                address: '0x123',
                index: 0
            }})
            .expect(200)
            .then(() => {
                expect(db.storeErc721Token).toHaveBeenCalledWith(
                    1,
                    '0x123',
                    {
                        tokenId: '0',
                        index: 0,
                        owner: '0xabc',
                        URI: 'http://metadata',
                        metadata: { name: 'My Cool NFT' }
                    }
                );
                done();
            });
    });

    it('Should make ipfs link fetachable', (done) => {
        ERC721Connector.mockImplementationOnce(() => ({
            tokenByIndex: jest.fn().mockResolvedValue('0'),
            ownerOf: jest.fn().mockResolvedValue('0xabc'),
            tokenURI: jest.fn().mockResolvedValue('ipfs://ipfslink')
        }));
        request.post(BASE_URL)
            .send({ data : {
                workspaceId: 1,
                address: '0x123',
                index: 0
            }})
            .expect(200)
            .then(() => {
                expect(axios.get).toHaveBeenCalledWith('https://ipfs.io/ipfs/ipfslink');
                done();
            });
    });
});

require('../mocks/lib/firebase');
require('../mocks/lib/rpc');
require('../mocks/middlewares/taskAuth');
jest.mock('axios');

const axios = require('axios');
const { ERC721Connector } = require('../../lib/rpc');
const db = require('../../lib/firebase');

const supertest = require('supertest');
const app = require('../../app');
const request = supertest(app);

const BASE_URL = '/tasks/reloadErc721';

beforeEach(() => jest.clearAllMocks());

describe('POST /', () => {
    it('Should update the token with new metadata & owner', (done) => {
        jest.spyOn(db, 'getWorkspaceById').mockResolvedValueOnce({ id: '123', name: 'My Workspace', rpcServer: 'remote' });
        ERC721Connector.mockImplementationOnce(() => ({
            tokenByIndex: jest.fn().mockResolvedValue('0'),
            tokenURI: jest.fn().mockResolvedValue('ipfs://ipfslink'),
            ownerOf: jest.fn().mockResolvedValue('0xabc')
        }));
        jest.spyOn(axios, 'get').mockResolvedValue({ data: { name: 'New Name' }});
        request.post(BASE_URL)
            .send({ data: { uid: '123', workspaceId: 123, address: '0x123', index: 0 }})
            .expect(200)
            .then(() => {
                expect(db.updateErc721Token).toHaveBeenCalledWith('123', '0x123', 0, { owner: '0xabc', metadata: { name: 'New Name' }});
                done();
            });
    });
});

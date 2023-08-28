require('../mocks/lib/firebase');
require('../mocks/lib/rpc');
require('../mocks/lib/queue');
jest.mock('axios');

const axios = require('axios');
const { ERC721Connector } = require('../../lib/rpc');
const db = require('../../lib/firebase');

const reloadErc721Token = require('../../jobs/reloadErc721Token');

beforeEach(() => jest.clearAllMocks());

describe('reloadErc721Token', () => {
    it('Should update the token with new metadata & owner', (done) => {
        jest.spyOn(db, 'getWorkspaceById').mockResolvedValueOnce({ id: '123', name: 'My Workspace', rpcServer: 'remote', erc721LoadingEnabled: true });
        jest.spyOn(db, 'getContractByWorkspaceId').mockResolvedValueOnce({ id: '123', has721Metadata: true, has721Enumerable: true });
        ERC721Connector.mockImplementationOnce(() => ({
            tokenByIndex: jest.fn().mockResolvedValue('0'),
            tokenURI: jest.fn().mockResolvedValue('https://tokenlink'),
            ownerOf: jest.fn().mockResolvedValue('0xabc'),
            totalSupply: jest.fn().mockResolvedValue(null),
            symbol: jest.fn().mockResolvedValue('ETL'),
            name: jest.fn().mockResolvedValue('Ethernal')
        }));
        jest.spyOn(axios, 'get').mockResolvedValue({ data: { name: 'New Name' }});

        reloadErc721Token({
            data: { uid: '123', workspaceId: 123, address: '0x123', tokenId: '0' }
        }).then(() => {
            expect(db.storeContractDataWithWorkspaceId).not.toHaveBeenCalled();
            expect(db.storeErc721Token).toHaveBeenCalledWith('123', '0x123', { URI: 'https://tokenlink', metadata: { name: 'New Name' }, owner: '0xabc', tokenId: '0' });
            done();
        });
    });

    it('Should create the contract if it does not exist', (done) => {
        jest.spyOn(db, 'getWorkspaceById').mockResolvedValueOnce({ id: '123', name: 'My Workspace', rpcServer: 'remote', erc721LoadingEnabled: true });
        jest.spyOn(db, 'storeContractDataWithWorkspaceId').mockResolvedValueOnce({ id: 2 });
        ERC721Connector.mockImplementationOnce(() => ({
            tokenByIndex: jest.fn().mockResolvedValue('0'),
            tokenURI: jest.fn().mockResolvedValue('https://tokenlink'),
            ownerOf: jest.fn().mockResolvedValue('0xabc'),
            totalSupply: jest.fn().mockResolvedValue('1000'),
            symbol: jest.fn().mockResolvedValue('ETL'),
            name: jest.fn().mockResolvedValue('Ethernal')
        }));
        jest.spyOn(axios, 'get').mockResolvedValue({ data: { name: 'New Name' }});

        reloadErc721Token({
            data: { uid: '123', workspaceId: 123, address: '0x123', tokenId: '0' }
        }).then(() => {
            expect(db.storeContractDataWithWorkspaceId).toHaveBeenCalledWith('123', '0x123');
            expect(db.storeContractDataWithWorkspaceId).toHaveBeenCalledWith('123', '0x123', { tokenTotalSupply: '1000' });
            done();
        });
    });
});

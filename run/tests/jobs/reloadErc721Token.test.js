require('../mocks/lib/firebase');
require('../mocks/models');
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

    describe('data: URIs', () => {
        const run = async (URI) => {
            jest.spyOn(db, 'getWorkspaceById').mockResolvedValueOnce({ id: '123', name: 'My Workspace', rpcServer: 'remote', erc721LoadingEnabled: true });
            jest.spyOn(db, 'getContractByWorkspaceId').mockResolvedValueOnce({ id: '123', has721Metadata: true, has721Enumerable: true });
            ERC721Connector.mockImplementationOnce(() => ({
                tokenURI: jest.fn().mockResolvedValue(URI),
                ownerOf: jest.fn().mockResolvedValue('0xabc'),
                totalSupply: jest.fn().mockResolvedValue(null)
            }));
            return reloadErc721Token({ data: { uid: '123', workspaceId: 123, address: '0x123', tokenId: '0' }});
        };

        it('Should decode base64 JSON without calling axios', async () => {
            const URI = `data:application/json;base64,${Buffer.from(JSON.stringify({ name: 'On-chain' })).toString('base64')}`;
            await run(URI);

            expect(axios.get).not.toHaveBeenCalled();
            expect(db.storeErc721Token).toHaveBeenCalledWith('123', '0x123', { URI, metadata: { name: 'On-chain' }, owner: '0xabc', tokenId: '0' });
        });

        it('Should decode percent-encoded JSON without calling axios', async () => {
            const URI = `data:application/json;charset=utf-8,${encodeURIComponent('{"name":"On-chain"}')}`;
            await run(URI);

            expect(axios.get).not.toHaveBeenCalled();
            expect(db.storeErc721Token).toHaveBeenCalledWith('123', '0x123', { URI, metadata: { name: 'On-chain' }, owner: '0xabc', tokenId: '0' });
        });

        it('Should store empty metadata for a malformed data URI', async () => {
            const URI = 'data:application/json;base64,bm90IGpzb24=';
            await run(URI);

            expect(axios.get).not.toHaveBeenCalled();
            expect(db.storeErc721Token).toHaveBeenCalledWith('123', '0x123', { URI, metadata: {}, owner: '0xabc', tokenId: '0' });
        });

        it('Should store empty metadata for a non-JSON data URI', async () => {
            const URI = 'data:text/plain,hello';
            await run(URI);

            expect(axios.get).not.toHaveBeenCalled();
            expect(db.storeErc721Token).toHaveBeenCalledWith('123', '0x123', { URI, metadata: {}, owner: '0xabc', tokenId: '0' });
        });

        it('Should still fetch http URIs with axios', async () => {
            axios.get.mockResolvedValueOnce({ data: { name: 'Remote' }});
            await run('https://tokenlink/1.json');

            expect(axios.get).toHaveBeenCalledWith('https://tokenlink/1.json');
            expect(db.storeErc721Token).toHaveBeenCalledWith('123', '0x123', { URI: 'https://tokenlink/1.json', metadata: { name: 'Remote' }, owner: '0xabc', tokenId: '0' });
        });
    });
});

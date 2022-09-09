require('../mocks/ethers');
jest.mock('axios');

const ethers = require('ethers');
const axios = require('axios');
const { ERC721Connector } = require('@/lib/rpc');
import DSProxyContract from '../fixtures/DSProxyContract';
import ERC721 from '@/abis/erc721.json';
import ERC721_METADATA from '@/abis/erc721Metadata.json';
import ERC721_ENUMERABLE from '@/abis/erc721Enumerable.json';

beforeEach(() => jest.clearAllMocks());

describe('ERC721Connector', () => {
   it('Should create an instance with the correct interfaces', () => {
       const erc721 = new ERC721Connector('http://localhost', '0x123', { metadata: true, enumerable: true });
       let expected = ERC721.concat(ERC721_METADATA);
       expected = expected.concat(ERC721_ENUMERABLE);
       expect(erc721.abi).toEqual(expected);
   });

    it('Should return token data for a given index', async () => {
        jest.spyOn(axios, 'get').mockResolvedValue({ data: { metadata: 'image' }});
        const erc721 = new ERC721Connector('http://localhost', '0x123', { metadata: true, enumerable: true });
        const token = await erc721.fetchTokenByIndex(1);
        expect(token).toEqual({
            tokenId: '1',
            owner: '0x123',
            URI: 'ipfs://QmPbxeGcXhYQQNgsC6a36dDyYUcHgMLnGKnF8pVFmGsvqi',
            metadata: { metadata: 'image' }
        });
    });

    it('Should throw an error if contract is not enumerable', async () => {
        const erc721 = new ERC721Connector('http://localhost', '0x123', { metadata: true, enumerable: false });
        await expect(async () => {
            await erc721.fetchTokenByIndex(1);
        }).rejects.toThrow('This method is only available on ERC721 implemeting the Enumerable interface');
    });

    it('Should return null if the index is invalid', async () => {
        const erc721 = new ERC721Connector('http://localhost', '0x123', { metadata: true, enumerable: true });
        const res = await erc721.fetchTokenByIndex(100000000);
        expect(res).toEqual(null);
    });
});



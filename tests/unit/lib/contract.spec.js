require('../mocks/ethers');
require('../mocks/rpc');

const ethers = require('ethers');
const { isErc20, isErc721, findPatterns, formatErc721Metadata } = require('@/lib/contract');
const { ContractConnector, ERC721Connector } = require('@/lib/rpc');
import DSProxyContract from '../fixtures/DSProxyContract';
import ERC20 from '@/abis/erc20.json';
import ERC721 from '@/abis/erc721.json';

beforeEach(() => jest.clearAllMocks());

describe('formatErc721Metadata', () => {
    it('Should return empty data if no metadata', () => {
        const res = formatErc721Metadata({ tokenId: 1 });
        expect(res).toEqual({
            tokenId: 1,
            attributes: {
                name: `#1`,
                image_data: null,
                background_color: null,
                description: null,
                external_url: null,
                properties: [],
                levels: [],
                boosts: [],
                stats: [],
                dates: []
            }
        });
    });

    it('Should return formatted metadata if they are here', () => {
        const token = {
            tokenId: 1,
            metadata: {
                name: 'My NFT',
                image_data: '<svg></svg>',
                background_color: '#2345',
                external_url: 'http://url',
                description: 'Best NFT',
                attributes: [
                    { trait_type: 'Object', value: 'thing' },
                    { trait_type: 'Level', value: 2 },
                    { trait_type: 'Boost', display_type: 'boost_number', value: 3 },
                    { trait_type: 'Strength', display_type: 'number', value: 4 },
                    { trait_type: 'Birthday', display_type: 'date', value: 1662365851 }
                ]
            }
        }
        const res = formatErc721Metadata(token);
        expect(res).toEqual({
            tokenId: 1,
            metadata: {
                name: 'My NFT',
                image_data: '<svg></svg>',
                background_color: '#2345',
                external_url: 'http://url',
                description: 'Best NFT',
                attributes: [
                    { trait_type: 'Object', value: 'thing' },
                    { trait_type: 'Level', value: 2 },
                    { trait_type: 'Boost', display_type: 'boost_number', value: 3 },
                    { trait_type: 'Strength', display_type: 'number', value: 4 },
                    { trait_type: 'Birthday', display_type: 'date', value: 1662365851 }
                ]
            },
            attributes: {
                name: 'My NFT',
                image_data: '<svg></svg>',
                background_color: '#2345',
                external_url: 'http://url',
                description: 'Best NFT',
                properties: [{ trait_type: 'Object', value: 'thing' }],
                levels: [{ trait_type: 'Level', value: 2 }],
                boosts: [{ trait_type: 'Boost', display_type: 'boost_number', value: 3 }],
                stats: [{ trait_type: 'Strength', display_type: 'number', value: 4 }],
                dates: [{ trait_type: 'Birthday', display_type: 'date', value: 1662365851 }]
            }
        });
    });

    it('Should process ipfs image link to be insertable', () => {
        const token = {
            tokenId: 1,
            metadata: {
                image: 'ipfs://QmPbxeGcXhYQQNgsC6a36dDyYUcHgMLnGKnF8pVFmGsvqi'
            }
        };
        const res = formatErc721Metadata(token);
        expect(res).toEqual({
            tokenId: 1,
            attributes: {
                name: '#1',
                image_data: `<img style="height: 100%; width: 100%; object-fit: cover" src="https://ipfs.io/ipfs/QmPbxeGcXhYQQNgsC6a36dDyYUcHgMLnGKnF8pVFmGsvqi" />`,
                background_color: null,
                description: null,
                external_url: null,
                properties: [],
                levels: [],
                boosts: [],
                stats: [],
                dates: []
            },
            metadata: {
                image: 'ipfs://QmPbxeGcXhYQQNgsC6a36dDyYUcHgMLnGKnF8pVFmGsvqi'
            }
        });
    });

    it('Should process image link to be insertable', () => {
        const token = {
            tokenId: 1,
            metadata: {
                image: 'https://myimage'
            }
        };
        const res = formatErc721Metadata(token);
        expect(res).toEqual({
            tokenId: 1,
            attributes: {
                name: '#1',
                image_data: `<img style="height: 100%; width: 100%; object-fit: cover" src="https://myimage" />`,
                background_color: null,
                description: null,
                external_url: null,
                properties: [],
                levels: [],
                boosts: [],
                stats: [],
                dates: []
            },
            metadata: {
                image: 'https://myimage'
            }
        });
    });
});

describe('findPatterns', () => {
    const rpcServer = 'http://localhost', contractAddress = '0x123';

    it('Should find erc20 properties without abi', async () => {
        const properties = await findPatterns(rpcServer, contractAddress);
        expect(properties).toEqual({
            patterns: ['erc20'],
            tokenSymbol: 'ETL',
            tokenName: 'Ethernal',
            tokenDecimals: 18,
            totalSupply: '1000',
            has721Metadata: false,
            has721Enumerable: false
        });
    });

    it('Should find proxy contract', async () => {
        const properties = await findPatterns(rpcServer, contractAddress, DSProxyContract.abi);
        expect(properties).toEqual({
            patterns: ['erc20', 'proxy'],
            tokenSymbol: 'ETL',
            tokenName: 'Ethernal',
            tokenDecimals: 18,
            totalSupply: '1000',
            has721Metadata: false,
            has721Enumerable: false
        });
    });

    it('Should find erc721 properties', async () => {
        jest.spyOn(ethers, 'Contract').mockImplementationOnce(function() {
            return {
                name: () => 'Ethernal',
                symbol: () => 'ETL',
                decimals: () => null,
                totalSupply: () => 1000,
            }
        });
        ContractConnector.mockImplementation(function() {
            return {
                has721Interface: jest.fn().mockResolvedValue(true),
                has721Metadata: jest.fn().mockResolvedValue(true),
                has721Enumerable: jest.fn().mockResolvedValue(true),
            }
        });
        ERC721Connector.mockImplementation(function() {
            return {
                symbol: jest.fn().mockResolvedValue('ETL'),
                name: jest.fn().mockResolvedValue('Ethernal'),
                totalSupply: jest.fn().mockResolvedValue(1000)
            }
        });
        const properties = await findPatterns(rpcServer, contractAddress);
        expect(properties).toEqual({
            patterns: ['erc721'],
            tokenSymbol: 'ETL',
            tokenName: 'Ethernal',
            tokenDecimals: undefined,
            totalSupply: 1000,
            has721Metadata: true,
            has721Enumerable: true
        });
    });
});

describe('isErc20', () => {
    it('Should return true if the abi is erc20', () => {
        expect(isErc20(ERC20)).toBe(true);
    });

    it('Should return false if the abi is not erc20', () => {
        expect(isErc20(DSProxyContract.abi)).toBe(false);
    });
});

describe('isErc721', () => {
    it('Should return true if the abi is erc721', () => {
        expect(isErc721(ERC721)).toBe(true);
    });

    it('Should return false if the abi is not erc721', () => {
        expect(isErc721(DSProxyContract.abi)).toBe(false);
    });
});

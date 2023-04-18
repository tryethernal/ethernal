jest.mock('axios', () => ({
    get: jest.fn().mockResolvedValue({
        data: {
            message: 'OK',
            result: [
                { ContractName: 'Contract', ABI: JSON.stringify([{ my: 'function' }])}
            ],
            Proxy: '0'
        }
    })
}));
require('../mocks/lib/ethers');
require('../mocks/lib/utils');
require('../mocks/lib/firebase');
require('../mocks/lib/transactions');
require('../mocks/lib/rpc');
require('../mocks/lib/queue');
require('../mocks/lib/yasold');

const axios = require('axios');
const ethers = require('ethers');
const db = require('../../lib/firebase');
const transactionsLib = require('../../lib/transactions');
const { ContractConnector, ERC721Connector } = require('../../lib/rpc');
const ERC721_ABI = require('../fixtures/ERC721_ABI.json');

const contractProcessing = require('../../jobs/contractProcessing');

beforeEach(() => jest.clearAllMocks());

describe('contractProcessing', () => {
    jest.spyOn(db, 'getWorkspaceById').mockResolvedValue({ id: 1, name: 'My Workspace', public: true });
    jest.spyOn(db, 'getUserById').mockResolvedValue({ id: 1, firebaseUserId: '123' });
    jest.spyOn(db, 'getWorkspaceContractById').mockResolvedValue({ workspaceId: 1, address: '0x123' });
    jest.spyOn(db, 'getContractByHashedBytecode').mockResolvedValue(null);

    it('Should return a 200 without any processing if contract is not found', (done) => {
        jest.spyOn(db, 'getWorkspaceContractById').mockResolvedValueOnce(null);

        contractProcessing({
            data: {
                workspaceId: 1,
                contractId: 2
            }
        }).then(() => {
            expect(db.getUserById).not.toHaveBeenCalled();
            done();
        });
    });

    it('Should try to find metadata from scanner if it cannot find everything locally', (done) => {
        contractProcessing({
            data: {
                workspaceId: 1,
                contractId: 2
            }
        }).then(() => {
            expect(db.storeContractData).toHaveBeenCalledWith('123', 'My Workspace', '0x123', { asm: 'asm', bytecode: '0x1234', hashedBytecode: '0x56570de287d73cd1cb6092bb8fdee6173974955fdef345ae579ee9f475ea7432', name: 'Contract', abi: [{ my: 'function' }]});
            done();
        });
    });

    it('Should get proxy contract if applicable', (done) => {
        jest.spyOn(axios, 'get').mockResolvedValueOnce({
            data: {
                message: 'OK',
                result: [
                    { ContractName: 'Contract', Proxy: '1', Implementation: '0x456', ABI: JSON.stringify([{ my: 'function' }])}
                ]
            }
        });

        contractProcessing({
            data: {
                workspaceId: 1,
                contractId: 2
            }
        }).then(() => {
            expect(db.storeContractData).toHaveBeenCalledWith('123', 'My Workspace', '0x456', { address: '0x456' });
            expect(db.storeContractData).toHaveBeenCalledWith('123', 'My Workspace', '0x123', { name: 'Contract', asm: 'asm', bytecode: '0x1234', hashedBytecode: '0x56570de287d73cd1cb6092bb8fdee6173974955fdef345ae579ee9f475ea7432', proxy: '0x456', abi: [{ my: 'function' }]});
            done();
        });
    });

    it('Should store collection data if the abi is erc721', (done) => {
        jest.spyOn(axios, 'get').mockResolvedValueOnce(null);
        jest.spyOn(ethers, 'Contract').mockReturnValueOnce({
            decimals: jest.fn().mockResolvedValue(null),
            symbol: jest.fn().mockResolvedValue(null),
            name: jest.fn().mockResolvedValue(null),
            totalSupply: jest.fn().mockResolvedValue(null)
        });
        ContractConnector.mockImplementationOnce(() => ({
            name: jest.fn().mockResolvedValue('Ethernal'),
            has721Metadata: jest.fn().mockResolvedValue(true),
            has721Enumerable: jest.fn().mockResolvedValue(true),
            symbol: jest.fn().mockResolvedValue('ETL'),
            totalSupply: jest.fn().mockResolvedValue('1000'),
            getBytecode: jest.fn().mockResolvedValue('0x1234')
        }));
        jest.spyOn(db, 'getWorkspaceById').mockResolvedValueOnce({ id: 1, name: 'My Workspace', public: true, rpcServer: 'http://rpc.ethernal.com' });
        jest.spyOn(db, 'getWorkspaceContractById').mockResolvedValue({ workspaceId: 1, address: '0x123', abi: ERC721_ABI });

        contractProcessing({
            data: {
                workspaceId: 1,
                contractId: 2
            }
        }).then(() => {
            expect(db.storeContractData).toHaveBeenCalledWith('123', 'My Workspace', '0x123', {
                patterns: ['erc721'],
                processed: true,
                tokenName: 'Ethernal',
                tokenSymbol: 'ETL',
                totalSupply: '1000',
                has721Enumerable: true,
                has721Metadata: true
            });
            done();
        });
    });

    it('Should detect erc721 without an abi and store collection data', (done) => {
        jest.spyOn(axios, 'get').mockResolvedValueOnce(null);
        jest.spyOn(ethers, 'Contract').mockReturnValueOnce({
            decimals: jest.fn().mockRejectedValue(null),
            symbol: jest.fn().mockResolvedValue(null),
            name: jest.fn().mockResolvedValue(null),
            totalSupply: jest.fn().mockResolvedValue(null)
        });
        jest.spyOn(db, 'getWorkspaceById').mockResolvedValueOnce({ id: 1, name: 'My Workspace', public: true, rpcServer: 'http://rpc.ethernal.com' });
        jest.spyOn(db, 'getWorkspaceContractById').mockResolvedValue({ workspaceId: 1, address: '0x123' });
        ContractConnector.mockImplementation(() => ({
            has721Metadata: jest.fn().mockResolvedValue(true),
            has721Enumerable: jest.fn().mockResolvedValue(true),
            has721Interface: jest.fn().mockResolvedValue(true),
            getBytecode: jest.fn().mockResolvedValue('0x1234')
        }));
        ERC721Connector.mockImplementationOnce(() => ({
            name: jest.fn().mockResolvedValue('Ethernal'),
            symbol: jest.fn().mockResolvedValue('ETL'),
            totalSupply: jest.fn().mockResolvedValue('1000'),
        }));

        contractProcessing({
            data: {
                workspaceId: 1,
                contractId: 2
            }
        }).then(() => {
            expect(db.storeContractData).toHaveBeenCalledWith('123', 'My Workspace', '0x123', {
                patterns: ['erc721'],
                processed: true,
                tokenName: 'Ethernal',
                tokenSymbol: 'ETL',
                totalSupply: '1000',
                has721Enumerable: true,
                has721Metadata: true
            });
            done();
        });
    });

    it('Should fetch & store contract info as proxy if the workspace is public', (done) => {
        jest.spyOn(db, 'getWorkspaceById').mockResolvedValueOnce({ id: 1, name: 'My Workspace', public: true, rpcServer: 'http://rpc.ethernal.com' });
        jest.spyOn(db, 'getWorkspaceContractById').mockResolvedValue({ workspaceId: 1, address: '0x123', abi: [{ my: 'function' }]});
        jest.spyOn(ethers, 'Contract').mockReturnValueOnce({
            decimals: jest.fn().mockResolvedValue(18),
            symbol: jest.fn().mockResolvedValue('ETL'),
            name: jest.fn().mockResolvedValue('Ethernal'),
            totalSupply: jest.fn().mockResolvedValue('1000')
        });
        ContractConnector.mockImplementation(() => ({
            has721Metadata: jest.fn().mockResolvedValue(false),
            has721Enumerable: jest.fn().mockResolvedValue(false),
            has721Interface: jest.fn().mockResolvedValue(false),
            getBytecode: jest.fn().mockResolvedValue('0x1234')
        }));

        contractProcessing({
            data: {
                workspaceId: 1,
                contractId: 2
            }
        }).then(() => {
            expect(db.storeContractData).toHaveBeenCalledWith('123', 'My Workspace', '0x123', {
                patterns: ['erc20', 'proxy'],
                processed: true,
                tokenName: 'Ethernal',
                tokenSymbol: 'ETL',
                tokenDecimals: 18,
                totalSupply: "1000"
            });
            done();
        });
    });

    it('Should reprocess all contract transactions', (done) => {
        jest.spyOn(db, 'getContractTransactions').mockResolvedValue([{ id: 123 }, { id: 124 }]);

        contractProcessing({
            data: {
                workspaceId: 1,
                contractId: 2
            }
        }).then(() => {
            expect(transactionsLib.processTransactions).toHaveBeenCalledWith([ 123, 124 ]);
            done();
        });
    });
});

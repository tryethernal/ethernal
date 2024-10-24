jest.mock('axios', () => ({
    get: jest.fn().mockResolvedValue({
        data: {
            message: 'OK',
            result: [
                {
                    ContractName: 'Contract',
                    ABI: JSON.stringify([{ my: 'function' }]),
                    SourceCode: ''
                }
            ],
            Proxy: '0'
        }
    })
}));
require('../mocks/models');
require('../mocks/lib/ethers');
require('../mocks/lib/utils');
require('../mocks/lib/firebase');
require('../mocks/lib/transactions');
require('../mocks/lib/rpc');
require('../mocks/lib/env');
require('../mocks/lib/queue');
require('../mocks/lib/yasold');

const axios = require('axios');
const db = require('../../lib/firebase');
const { ContractConnector, ERC721Connector } = require('../../lib/rpc');

const processContract = require('../../jobs/processContract');

beforeEach(() => jest.clearAllMocks());

describe('processContract', () => {
    it('Should return a 200 without any processing if contract is not found', (done) =>  {
        jest.spyOn(db, 'getContractById').mockResolvedValueOnce(null);

        processContract({ data: { contractId: 2 }})
            .then(() => {
                expect(db.getUserById).not.toHaveBeenCalled();
                done();
            });
    });

    it('Should verify the contract if scanner returns source data with multiple files', (done) => {
        jest.spyOn(db, 'getWorkspaceById').mockResolvedValueOnce({ id: 1, name: 'My Workspace', public: true });
        jest.spyOn(db, 'getUserById').mockResolvedValueOnce({ id: 1, firebaseUserId: '123' });
        jest.spyOn(db, 'getContractById').mockResolvedValueOnce({ workspaceId: 1, address: '0x123' });
        jest.spyOn(db, 'getContractByHashedBytecode').mockResolvedValueOnce(null);
        ContractConnector.mockImplementation(() => ({
            isErc20: jest.fn().mockResolvedValue(false),
            isErc721: jest.fn().mockResolvedValue(false),
            isErc1155: jest.fn().mockResolvedValue(false),
            decimals: jest.fn().mockResolvedValue(null),
            symbol: jest.fn().mockResolvedValue('ETL'),
            name: jest.fn().mockResolvedValue('Ethernal'),
            totalSupply: jest.fn().mockResolvedValue('1000'),
            getBytecode: jest.fn().mockResolvedValue('0x1234')
        }));
        jest.spyOn(axios, 'get').mockResolvedValueOnce({
            data: {
                message: 'OK',
                result: [
                    {
                        SourceCode: `{${JSON.stringify({ sources: { "contracts/Contract.sol": { content: '// Source Code' } }})}}`,
                        ContractName: 'Contract',
                        CompilerVersion: 'v0.3.1-2016-04-12-3ad5e82',
                        OptimizationUsed: '1',
                        Runs: '200',
                        ConstructorArguments: '000000000000000000000000da4a4626d3e16e094de3225a751aab7128e965260000000000000000000000004a574510c7014e4ae985403536074abe582adfc80000000000000000000000000000000000000000000000001bc16d674ec80000000000000000000000000000000000000000000000000a968163f0a57b4000000000000000000000000000000000000000000000000000000000000057495e100000000000000000000000000000000000000000000000000000000000000000',
                        EvmVersion: 'Default',
                        ABI: JSON.stringify([{ my: 'function' }]),
                        Library: ''
                    }
                ]
            }
        });

        processContract({
            data: {
                workspaceId: 1,
                contractId: 2
            }
        }).then(() => {
            expect(db.storeContractVerificationData).toHaveBeenCalledWith(1, '0x123', {
                compilerVersion: 'v0.3.1-2016-04-12-3ad5e82',
                runs: '200',
                contractName: 'Contract',
                constructorArguments: '000000000000000000000000da4a4626d3e16e094de3225a751aab7128e965260000000000000000000000004a574510c7014e4ae985403536074abe582adfc80000000000000000000000000000000000000000000000001bc16d674ec80000000000000000000000000000000000000000000000000a968163f0a57b4000000000000000000000000000000000000000000000000000000000000057495e100000000000000000000000000000000000000000000000000000000000000000',
                evmVersion: 'Default',
                libraries: '',
                sources: {
                    'contracts/Contract.sol': { content: '// Source Code' }
                }
            });
            done();
        });
    });

    it('Should verify the contract if scanner returns source data with one file', (done) => {
        jest.spyOn(db, 'getWorkspaceById').mockResolvedValueOnce({ id: 1, name: 'My Workspace', public: true });
        jest.spyOn(db, 'getUserById').mockResolvedValueOnce({ id: 1, firebaseUserId: '123' });
        jest.spyOn(db, 'getContractById').mockResolvedValueOnce({ workspaceId: 1, address: '0x123' });
        jest.spyOn(db, 'getContractByHashedBytecode').mockResolvedValueOnce(null);
        ContractConnector.mockImplementation(() => ({
            isErc20: jest.fn().mockResolvedValue(false),
            isErc721: jest.fn().mockResolvedValue(false),
            isErc1155: jest.fn().mockResolvedValue(false),
            decimals: jest.fn().mockResolvedValue(null),
            symbol: jest.fn().mockResolvedValue('ETL'),
            name: jest.fn().mockResolvedValue('Ethernal'),
            totalSupply: jest.fn().mockResolvedValue('1000'),
            getBytecode: jest.fn().mockResolvedValue('0x1234')
        }));
        jest.spyOn(axios, 'get').mockResolvedValueOnce({
            data: {
                message: 'OK',
                result: [
                    {
                        SourceCode: '// Source Code',
                        ContractName: 'Contract',
                        CompilerVersion: 'v0.3.1-2016-04-12-3ad5e82',
                        OptimizationUsed: '1',
                        Runs: '200',
                        ConstructorArguments: '000000000000000000000000da4a4626d3e16e094de3225a751aab7128e965260000000000000000000000004a574510c7014e4ae985403536074abe582adfc80000000000000000000000000000000000000000000000001bc16d674ec80000000000000000000000000000000000000000000000000a968163f0a57b4000000000000000000000000000000000000000000000000000000000000057495e100000000000000000000000000000000000000000000000000000000000000000',
                        EvmVersion: 'Default',
                        ABI: JSON.stringify([{ my: 'function' }]),
                        Library: ''
                    }
                ]
            }
        });

        processContract({
            data: {
                workspaceId: 1,
                contractId: 2
            }
        }).then(() => {
            expect(db.storeContractVerificationData).toHaveBeenCalledWith(1, '0x123', {
                compilerVersion: 'v0.3.1-2016-04-12-3ad5e82',
                runs: '200',
                contractName: 'Contract',
                constructorArguments: '000000000000000000000000da4a4626d3e16e094de3225a751aab7128e965260000000000000000000000004a574510c7014e4ae985403536074abe582adfc80000000000000000000000000000000000000000000000001bc16d674ec80000000000000000000000000000000000000000000000000a968163f0a57b4000000000000000000000000000000000000000000000000000000000000057495e100000000000000000000000000000000000000000000000000000000000000000',
                evmVersion: 'Default',
                libraries: '',
                sources: {
                    'Contract.sol': { content: '// Source Code' }
                }
            });
            done();
        });
    });

    it('Should try to find metadata from scanner if it cannot find everything locally', (done) => {
        jest.spyOn(db, 'getWorkspaceById').mockResolvedValueOnce({ id: 1, name: 'My Workspace', public: true });
        jest.spyOn(db, 'getUserById').mockResolvedValueOnce({ id: 1, firebaseUserId: '123' });
        jest.spyOn(db, 'getContractById').mockResolvedValueOnce({ workspaceId: 1, address: '0x123' });
        jest.spyOn(db, 'getContractByHashedBytecode').mockResolvedValueOnce(null);
        ContractConnector.mockImplementation(() => ({
            isErc20: jest.fn().mockResolvedValue(false),
            isErc721: jest.fn().mockResolvedValue(false),
            isErc1155: jest.fn().mockResolvedValue(false),
            getBytecode: jest.fn().mockResolvedValue('0x1234')
        }));
        processContract({ data: { contractId: 2 }})
            .then(() => {
                expect(db.storeContractData).toHaveBeenCalledWith('123', 'My Workspace', '0x123', { patterns: [], asm: 'asm', bytecode: '0x1234', hashedBytecode: '0x56570de287d73cd1cb6092bb8fdee6173974955fdef345ae579ee9f475ea7432', name: 'Contract', abi: [{ my: 'function' }]});
                done();
            });
    });

    it('Should get proxy contract if applicable', (done) => {
        jest.spyOn(db, 'getWorkspaceById').mockResolvedValueOnce({ id: 1, name: 'My Workspace', public: true });
        jest.spyOn(db, 'getUserById').mockResolvedValueOnce({ id: 1, firebaseUserId: '123' });
        jest.spyOn(db, 'getContractById').mockResolvedValueOnce({ workspaceId: 1, address: '0x123' });
        jest.spyOn(db, 'getContractByHashedBytecode').mockResolvedValueOnce(null);
        ContractConnector.mockImplementation(() => ({
            isErc20: jest.fn().mockResolvedValue(false),
            isErc721: jest.fn().mockResolvedValue(false),
            isErc1155: jest.fn().mockResolvedValue(false),
            decimals: jest.fn().mockResolvedValue(null),
            symbol: jest.fn().mockResolvedValue('ETL'),
            name: jest.fn().mockResolvedValue('Ethernal'),
            totalSupply: jest.fn().mockResolvedValue('1000'),
            getBytecode: jest.fn().mockResolvedValue('0x1234')
        }));
        jest.spyOn(axios, 'get').mockResolvedValueOnce({
            data: {
                message: 'OK',
                result: [
                    { SourceCode: '', ContractName: 'Contract', Proxy: '1', Implementation: '0x456', ABI: JSON.stringify([{ my: 'function' }])}
                ]
            }
        });

        processContract({
            data: {
                workspaceId: 1,
                contractId: 2
            }
        }).then(() => {
            expect(db.storeContractData).toHaveBeenCalledWith('123', 'My Workspace', '0x456', { address: '0x456' });
            expect(db.storeContractData).toHaveBeenCalledWith('123', 'My Workspace', '0x123', { patterns: [], name: 'Contract', asm: 'asm', bytecode: '0x1234', hashedBytecode: '0x56570de287d73cd1cb6092bb8fdee6173974955fdef345ae579ee9f475ea7432', proxy: '0x456', abi: [{ my: 'function' }]});
            done();
        });
    });

    it('Should detect erc721 without an abi and store collection data', (done) => {
        jest.spyOn(axios, 'get').mockResolvedValueOnce({
            data: {
                message: 'NOTOK',
                result: [
                    {}
                ],
                Proxy: '0'
            }
        });
        jest.spyOn(db, 'getUserById').mockResolvedValueOnce({ id: 1, firebaseUserId: '123' });
        jest.spyOn(db, 'getWorkspaceById').mockResolvedValueOnce({ id: 1, name: 'My Workspace', public: true, rpcServer: 'http://rpc.ethernal.com' });
        jest.spyOn(db, 'getContractById').mockResolvedValue({ workspaceId: 1, address: '0x123' });
        ContractConnector.mockImplementation(() => ({
            isErc20: jest.fn().mockResolvedValue(false),
            isErc721: jest.fn().mockResolvedValue(true),
            isErc1155: jest.fn().mockResolvedValue(false),
            isProxy: jest.fn().mockResolvedValue(false),
            decimals: jest.fn().mockResolvedValue(null),
            symbol: jest.fn().mockResolvedValue('ETL'),
            name: jest.fn().mockResolvedValue('Ethernal'),
            totalSupply: jest.fn().mockResolvedValue('1000'),
            getBytecode: jest.fn().mockResolvedValue('0x1234')
        }));
        ERC721Connector.mockImplementation(() => ({
            isEnumerable: jest.fn().mockResolvedValueOnce(true),
            hasMetadata: jest.fn().mockResolvedValueOnce(true)
        }));

        processContract({
            data: {
                workspaceId: 1,
                contractId: 2
            }
        }).then(() => {
            expect(db.storeContractData).toHaveBeenCalledWith('123', 'My Workspace', '0x123', {
                patterns: ['erc721'],
                tokenName: 'Ethernal',
                tokenSymbol: 'ETL',
                tokenTotalSupply: "1000",
                asm: 'asm',
                bytecode: '0x1234',
                hashedBytecode: '0x56570de287d73cd1cb6092bb8fdee6173974955fdef345ae579ee9f475ea7432',
                has721Enumerable: true,
                has721Metadata: true
            });
            done();
        });
    });

    it('Should fetch & store contract info as proxy if the workspace is public', (done) => {
        jest.spyOn(db, 'getWorkspaceById').mockResolvedValueOnce({ id: 1, name: 'My Workspace', public: true, rpcServer: 'http://rpc.ethernal.com' });
        jest.spyOn(db, 'getContractById').mockResolvedValue({ workspaceId: 1, address: '0x123', abi: [{ my: 'function' }]});
        jest.spyOn(db, 'getUserById').mockResolvedValueOnce({ id: 1, firebaseUserId: '123' });
        ContractConnector.mockImplementation(() => ({
            isErc20: jest.fn().mockResolvedValue(true),
            isErc721: jest.fn().mockResolvedValue(false),
            isErc1155: jest.fn().mockResolvedValue(false),
            isProxy: jest.fn().mockResolvedValue(true),
            decimals: jest.fn().mockResolvedValue(18),
            symbol: jest.fn().mockResolvedValue('ETL'),
            name: jest.fn().mockResolvedValue('Ethernal'),
            totalSupply: jest.fn().mockResolvedValue('1000'),
            getBytecode: jest.fn().mockResolvedValue('0x1234')
        }));

        processContract({
            data: {
                workspaceId: 1,
                contractId: 2
            }
        }).then(() => {
            expect(db.storeContractData).toHaveBeenCalledWith('123', 'My Workspace', '0x123', {
                name: 'Contract',
                abi: [{ my: 'function' }],
                patterns: ['erc20', 'proxy'],
                tokenName: 'Ethernal',
                tokenSymbol: 'ETL',
                tokenDecimals: 18,
                tokenTotalSupply: "1000",
                asm: 'asm',
                bytecode: '0x1234',
                hashedBytecode: '0x56570de287d73cd1cb6092bb8fdee6173974955fdef345ae579ee9f475ea7432'
            });
            done();
        });
    });
});

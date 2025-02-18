require('../mocks/lib/firebase');
require('../mocks/models');
require('../mocks/lib/queue');
const db = require('../../lib/firebase');

jest.mock('solc', () => ({
    loadRemoteVersion: jest.fn((compiler, cb) => {
        cb(null, {
            compile: jest.fn().mockReturnValue(JSON.stringify({
                contracts: {
                    source: {
                        MyContract: {
                            evm: {
                                bytecode: {
                                    object: '12341234123412341234123412341234000100011110001'
                                }
                            }
                        }
                    }
                }
            }))
        })
    })
}));
const solc = require('solc');

jest.mock('solc/linker', () => ({
    linkBytecode: jest.fn().mockReturnValue('12341234123412341234123412341234abcd000100011110001')
}));

const processContractVerification = require('../../lib/processContractVerification');

afterEach(() => jest.clearAllMocks()); 

describe('processContractVerification', () => {
    jest.spyOn(db, 'getWorkspaceById').mockResolvedValue({ id: 1, userId: 1, name: 'test' });
    jest.spyOn(db, 'getUserById').mockResolvedValue({ id: 1, firebaseUserId: '123' });

    it('Should rethrow compiler errors', async () => {
        jest.spyOn(solc, 'loadRemoteVersion').mockImplementationOnce((compiler, cb) => {
            cb(null, {
                compile: jest.fn().mockReturnValue(JSON.stringify({ errors: [{ severity: 'error', message: 'error' }] }))
            })
        });

        const message = {
            code: {
                sources: { source: 'source' },
                imports: { 'Import.sol': { contents: 'import' }}
            },
            publicExplorerParams: {
                userId: 1,
                workspaceId: 1
            },
            contractAddress: '0x123',
            contractName: 'MyContract'
        };

        await expect(async () => {
            await processContractVerification(db, message); 
        }).rejects.toEqual({ severity: 'error', message: 'error' });
    });

    it('Should handle imports', async () => {
        jest.spyOn(db, 'getContractDeploymentTxByAddress').mockResolvedValueOnce({ data: '0x12341234123412341234123412341234000100011110001' });

        jest.spyOn(solc, 'loadRemoteVersion').mockImplementationOnce((compiler, cb) => {
            cb(null, {
                compile: jest.fn((inputs, importsObj) => {
                    importsObj.import('Import.sol');
                    return JSON.stringify({
                        contracts: {
                            source: {
                                MyContract: {
                                    evm: {
                                        bytecode: {
                                            object: '12341234123412341234123412341234000100011110001'
                                        }
                                    }
                                }
                            }
                        }
                    });
                })
            })
        });

        const message = {
            compilerVersion: '1',
            code: {
                sources: { source: 'source' },
                imports: { 'Import.sol': { contents: 'import' }}
            },
            publicExplorerParams: {
                userId: 1,
                workspaceId: 1
            },
            contractAddress: '0x123',
            contractName: 'MyContract'
        };

        await processContractVerification(db, message); 
        expect(db.storeContractVerificationData).toHaveBeenCalledWith(1, '0x123', {
            compilerVersion: '1',
            constructorArguments: '',
            contractName: 'MyContract',
            evmVersion: 'cancun',
            sources: message.code.sources,
            libraries: undefined,
            runs: undefined
        });
    });

    it('Should throw an error if imports are missing', async () => {
        jest.spyOn(solc, 'loadRemoteVersion').mockImplementationOnce((compiler, cb) => {
            cb(null, {
                compile: jest.fn((inputs, importsObj) => {
                    importsObj.import('Import.sol');
                })
            })
        });

        const message = {
            code: {
                sources: { source: 'source' },
                imports: { import: { contents: 'import' }}
            },
            publicExplorerParams: {
                userId: 1,
                workspaceId: 1
            },
            contractAddress: '0x123',
            contractName: 'MyContract'
        };

        await expect(async () => {
            await processContractVerification(db, message); 
        }).rejects.toEqual(new Error(`Missing following imports: Import.sol`));
    });

    it('Should throw an error if it cannot load the compiler', async () => {
        jest.spyOn(solc, 'loadRemoteVersion').mockImplementationOnce((compiler, cb) => {
            cb(new Error('Invalid compiler'), null);
        });
        const message = {
            code: {
                sources: { source: 'source' },
                imports: { import: { contents: 'import' }}
            },
            publicExplorerParams: {
                userId: 1,
                workspaceId: 1
            },
            contractAddress: '0x123',
            contractName: 'MyContract'
        };

        await expect(async () => {
            await processContractVerification(db, message); 
        }).rejects.toEqual(new Error('Invalid compiler'));
    });

    it('Should throw an error if evmVersion is invalid', async () => {
        const message = {
            code: {
                sources: { source: 'source' },
                imports: { import: { contents: 'import' }}
            },
            evmVersion: 'Saint Même le Tenu',
            publicExplorerParams: {
                userId: 1,
                workspaceId: 1
            },
            contractAddress: '0x123',
            contractName: 'MyContract'
        };

        await expect(async () => {
            await processContractVerification(db, message); 
        }).rejects.toEqual(new Error(`Invalid EVM version "Saint Même le Tenu". Valid versions are: homestead, tangerineWhistle, spuriousDragon, byzantium, constantinople, petersburg, istanbul, berlin, london, paris, shanghai, cancun.`));
    });

    it('Should throw an error if there is a user / workspace mismatch', async () => {
        jest.spyOn(db, 'getWorkspaceById').mockResolvedValueOnce({ id: 1, userId: 2, name: 'test' });
        
        const message = {
            code: {
                sources: { source: 'source' },
                imports: { import: { contents: 'import' }}
            },
            optimizer: true,
            runs: -1,
            publicExplorerParams: {
                userId: 1,
                workspaceId: 1
            },
            contractAddress: '0x123',
            contractName: 'MyContract'
        };

        await expect(async () => {
            await processContractVerification(db, message); 
        }).rejects.toEqual(new Error('Workspace / User mismatch'));
    });

    it('Should throw an error with a negative number of runs', async () => {
        const message = {
            code: {
                sources: { source: 'source' },
                imports: { import: { contents: 'import' }}
            },
            optimizer: true,
            runs: -1,
            publicExplorerParams: {
                userId: 1,
                workspaceId: 1
            },
            contractAddress: '0x123',
            contractName: 'MyContract'
        };

        await expect(async () => {
            await processContractVerification(db, message); 
        }).rejects.toEqual(new Error('"runs" must be greater than 0.'));
    });

    it('Should throw an error if there is no source code', async () => {
        const message = {
            code: {}
        };

        await expect(async () => {
            await processContractVerification(db, message); 
        }).rejects.toEqual(new Error('Missing source code.'));
    });

    it('Should link bytecode if libraries are passed', async () => {
        jest.spyOn(db, 'getContractDeploymentTxByAddress').mockResolvedValueOnce({ data: '0x12341234123412341234123412341234abcd000100011110001' });

        const message = {
            compilerVersion: '1',
            evmVersion: 'berlin',
            runs: 200,
            code: {
                sources: { source: 'source' },
                imports: { import: { contents: 'import' }},
                libraries: {
                    MyLibrary: '0xabcd'
                }
            },
            publicExplorerParams: {
                userId: 1,
                workspaceId: 1
            },
            contractAddress: '0x123',
            contractName: 'MyContract'
        };

        await processContractVerification(db, message);
        expect(db.storeContractData).toHaveBeenCalledWith(
            '123',
            'test',
            '0x123',
            expect.anything()
        );
        expect(db.storeContractVerificationData).toHaveBeenCalledWith(1, '0x123', {
            compilerVersion: '1',
            constructorArguments: '',
            contractName: 'MyContract',
            evmVersion: 'berlin',
            sources: message.code.sources,
            libraries: { MyLibrary: '0xabcd' },
            runs: 200
        });
    });

    it('Should append constructor arguments properly', async () => {
        jest.spyOn(db, 'getContractDeploymentTxByAddress').mockResolvedValueOnce({ data: '0x12341234123412341234123412341234000100011110001000abcd' });

        const message = {
            compilerVersion: '1',
            evmVersion: 'berlin',
            runs: 200,
            code: {
                sources: { source: 'source' },
                imports: { import: { contents: 'import' }}
            },
            publicExplorerParams: {
                userId: 1,
                workspaceId: 1
            },
            contractAddress: '0x123',
            contractName: 'MyContract',
            constructorArguments: '000abcd'
        };

        await processContractVerification(db, message);
        expect(db.storeContractData).toHaveBeenCalledWith(
            '123',
            'test',
            '0x123',
            expect.anything()
        );
        expect(db.storeContractVerificationData).toHaveBeenCalledWith(1, '0x123', {
            compilerVersion: '1',
            constructorArguments: '000abcd',
            contractName: 'MyContract',
            evmVersion: 'berlin',
            sources: message.code.sources,
            libraries: undefined,
            runs: 200
        });
    });
});

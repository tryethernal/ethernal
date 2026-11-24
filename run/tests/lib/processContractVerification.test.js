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
        jest.spyOn(db, 'getContractDeploymentTxByAddress').mockResolvedValueOnce({ data: '0x1234123412341234123412341234123400010001111000100abcd' });

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
            constructorArguments: '00abcd'
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
            constructorArguments: '00abcd',
            contractName: 'MyContract',
            evmVersion: 'berlin',
            sources: message.code.sources,
            libraries: undefined,
            runs: 200
        });
    });

    it('Should accept 0x-prefixed constructor arguments and store them without the prefix', async () => {
        jest.spyOn(db, 'getContractDeploymentTxByAddress').mockResolvedValueOnce({ data: '0x1234123412341234123412341234123400010001111000100abcd' });

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
            constructorArguments: '0x00abcd'
        };

        await processContractVerification(db, message);
        expect(db.storeContractVerificationData).toHaveBeenCalledWith(1, '0x123', expect.objectContaining({
            constructorArguments: '00abcd'
        }));
    });

    it.each([
        ['odd length', '00abc'],
        ['non-hex characters', '00abzz'],
        ['not a string', { length: 2 }],
        ['false', false],
        ['zero', 0]
    ])('Should reject constructor arguments that are not even-length hex (%s)', async (_, constructorArguments) => {
        const message = {
            compilerVersion: '1',
            code: { sources: { source: 'source' } },
            publicExplorerParams: { userId: 1, workspaceId: 1 },
            contractAddress: '0x123',
            contractName: 'MyContract',
            constructorArguments
        };

        await expect(processContractVerification(db, message)).rejects.toThrow('Invalid constructor arguments');
    });

    it('Should reject constructor arguments that do not match the deployment transaction (longer than the data)', async () => {
        jest.spyOn(db, 'getContractDeploymentTxByAddress').mockResolvedValueOnce({ data: '0x1234' });

        const message = {
            compilerVersion: '1',
            code: { sources: { source: 'source' } },
            publicExplorerParams: { userId: 1, workspaceId: 1 },
            contractAddress: '0x123',
            contractName: 'MyContract',
            constructorArguments: 'aa'.repeat(10)
        };

        await expect(processContractVerification(db, message)).rejects.toThrow('Constructor arguments do not match the deployment transaction');
    });

    // NOTE: before the fix this call never returned (synchronous infinite loop), so jest's own timeout cannot
    // interrupt it. Run this file under an external timeout when checking for regressions.
    it('Should terminate and not verify a factory contract when the constructor arguments end with a metadata marker', async () => {
        // 51 bytes of CBOR-shaped metadata (map header 0xa2) + 2 length bytes (0x0033)
        const metadata = (fill) => 'a2' + fill.repeat(50) + '0033';
        // Runtime code embedding a second metadata blob, followed by its own trailing metadata.
        const compiled = 'cc'.repeat(10) + metadata('dd') + metadata('ee');
        const nested = 'ff'.repeat(8) + metadata('aa');
        const maliciousArguments = 'aa'.repeat(51) + '0033';

        jest.spyOn(solc, 'loadRemoteVersion').mockImplementationOnce((compiler, cb) => {
            cb(null, {
                compile: jest.fn().mockReturnValue(JSON.stringify({
                    contracts: {
                        source: {
                            Factory: { abi: [], evm: { bytecode: { object: compiled }}},
                            Product: { abi: [], evm: { bytecode: { object: nested }}}
                        }
                    }
                }))
            });
        });
        jest.spyOn(db, 'getContractDeploymentTxByAddress').mockResolvedValueOnce({ data: '0x' + '99'.repeat(10) + metadata('88') + maliciousArguments });

        const message = {
            compilerVersion: '1',
            code: { sources: { source: 'source' } },
            publicExplorerParams: { userId: 1, workspaceId: 1 },
            contractAddress: '0x123',
            contractName: 'Factory',
            constructorArguments: maliciousArguments
        };

        await expect(processContractVerification(db, message)).rejects.toThrow("Compiled bytecode doesn't match runtime bytecode");
        expect(db.storeContractVerificationData).not.toHaveBeenCalled();
    }, 5000);

    describe('metadata stripping', () => {
        // 51 bytes of CBOR-shaped metadata (map header 0xa2) + 2 length bytes (0x0033)
        const metadata = (fill) => 'a2' + fill.repeat(50) + '0033';
        const baseMessage = (contractName = 'MyContract') => ({
            compilerVersion: '1',
            code: { sources: { source: 'source' } },
            publicExplorerParams: { userId: 1, workspaceId: 1 },
            contractAddress: '0x123',
            contractName
        });
        const mockCompiledBytecode = (object) => {
            jest.spyOn(solc, 'loadRemoteVersion').mockImplementationOnce((compiler, cb) => {
                cb(null, {
                    compile: jest.fn().mockReturnValue(JSON.stringify({
                        contracts: { source: { MyContract: { abi: [], evm: { bytecode: { object }}}}}
                    }))
                });
            });
        };

        it('Should strip real metadata so builds differing only by metadata verify', async () => {
            mockCompiledBytecode('60806040' + metadata('11'));
            jest.spyOn(db, 'getContractDeploymentTxByAddress').mockResolvedValueOnce({ data: '0x60806040' + metadata('22') });

            await expect(processContractVerification(db, baseMessage())).resolves.toEqual({ verificationSucceded: true });
        });

        it('Should not strip a tail ending in 0033 that is not CBOR metadata', async () => {
            // Same first 98 chars, different tail. The tail looks like a 51-byte metadata blob but does not start
            // with a CBOR map header, so it is real code and must be compared.
            const head = 'c1'.repeat(49);
            mockCompiledBytecode(head + 'cc'.repeat(51) + '0033');
            jest.spyOn(db, 'getContractDeploymentTxByAddress').mockResolvedValueOnce({ data: '0x' + head + 'dd'.repeat(51) + '0033' });

            await expect(processContractVerification(db, baseMessage())).rejects.toThrow("Compiled bytecode doesn't match runtime bytecode");
            expect(db.storeContractVerificationData).not.toHaveBeenCalled();
        });

        it('Should not strip when the declared metadata length exceeds the bytecode', async () => {
            mockCompiledBytecode('aa'.repeat(10) + '0033');
            jest.spyOn(db, 'getContractDeploymentTxByAddress').mockResolvedValueOnce({ data: '0x' + 'bb'.repeat(10) + '0033' });

            await expect(processContractVerification(db, baseMessage())).rejects.toThrow("Compiled bytecode doesn't match runtime bytecode");
        });

        it('Should not strip when the declared metadata length is zero', async () => {
            mockCompiledBytecode('aa'.repeat(10) + '0000');
            jest.spyOn(db, 'getContractDeploymentTxByAddress').mockResolvedValueOnce({ data: '0x' + 'aa'.repeat(10) + '0000' });

            await expect(processContractVerification(db, baseMessage())).resolves.toEqual({ verificationSucceded: true });
        });
    });

    describe('constructor arguments', () => {
        const message = (constructorArguments) => ({
            compilerVersion: '1',
            code: { sources: { source: 'source' } },
            publicExplorerParams: { userId: 1, workspaceId: 1 },
            contractAddress: '0x123',
            contractName: 'MyContract',
            constructorArguments
        });

        it('Should reject same-length arguments that differ from the deployment data', async () => {
            jest.spyOn(db, 'getContractDeploymentTxByAddress').mockResolvedValueOnce({ data: '0x1234123412341234123412341234123400010001111000100abcd' });

            await expect(processContractVerification(db, message('00abce'))).rejects.toThrow('Constructor arguments do not match the deployment transaction');
            expect(db.storeContractVerificationData).not.toHaveBeenCalled();
        });

        it('Should match constructor arguments case-insensitively', async () => {
            jest.spyOn(db, 'getContractDeploymentTxByAddress').mockResolvedValueOnce({ data: '0x1234123412341234123412341234123400010001111000100ABCD' });

            await processContractVerification(db, message('00abcd'));
            expect(db.storeContractVerificationData).toHaveBeenCalled();
        });

        it('Should allow empty and null arguments', async () => {
            jest.spyOn(db, 'getContractDeploymentTxByAddress').mockResolvedValue({ data: '0x12341234123412341234123412341234000100011110001' });

            await processContractVerification(db, message(''));
            await processContractVerification(db, message(null));
            await processContractVerification(db, message(undefined));
            expect(db.storeContractVerificationData).toHaveBeenCalledTimes(3);
        });
    });
});

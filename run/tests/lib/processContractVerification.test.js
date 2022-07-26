require('../mocks/lib/firebase');
require('../mocks/lib/tasks');
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
                                    object: '1234'
                                }
                            }
                        }
                    }
                }
            }))
        })
    })
}));

jest.mock('solc/linker', () => ({
    linkBytecode: jest.fn().mockReturnValue('1234abcd')
}));

const processContractVerification = require('../../lib/processContractVerification');

afterEach(() => jest.clearAllMocks()); 

describe('processContractVerification', () => {
    jest.spyOn(db, 'getWorkspaceById').mockResolvedValue({ id: 1, userId: 1, name: 'test' });
    jest.spyOn(db, 'getUserById').mockResolvedValue({ id: 1, firebaseUserId: '123' });

    it('Should throw an error if there is no source code', async () => {
        const message = {
            code: {}
        };

        await expect(async () => {
            await processContractVerification(db, message); 
        }).rejects.toEqual(new Error('Missing source code.'));
    });

    it('Should set the verification status to success if source code is matching', async () => {
        jest.spyOn(db, 'getContractDeploymentTxByAddress').mockResolvedValueOnce({ data: '0x1234' });

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

        await processContractVerification(db, message);
        expect(db.updateContractVerificationStatus).toHaveBeenCalledWith(
            1,
            1,
            '0x123',
            'pending'
        );
        expect(db.updateContractVerificationStatus).toHaveBeenCalledWith(
            1,
            1,
            '0x123',
            'success'
        );
        expect(db.storeContractData).toHaveBeenCalledWith(
            '123',
            'test',
            '0x123',
            expect.anything()
        );
    });

    it('Should set the verification status to failed if source code is not matching', async () => {
        jest.spyOn(db, 'getContractDeploymentTxByAddress').mockResolvedValueOnce({ data: '0x56789' });

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

        await processContractVerification(db, message);
        expect(db.updateContractVerificationStatus).toHaveBeenCalledWith(
            1,
            1,
            '0x123',
            'pending'
        );
        expect(db.updateContractVerificationStatus).toHaveBeenCalledWith(
            1,
            1,
            '0x123',
            'failed'
        );
        expect(db.storeContractData).not.toHaveBeenCalled();
    });

    it('Should link bytecode if libraries are passed', async () => {
        jest.spyOn(db, 'getContractDeploymentTxByAddress').mockResolvedValueOnce({ data: '0x1234abcd' });

        const message = {
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
        expect(db.updateContractVerificationStatus).toHaveBeenCalledWith(
            1,
            1,
            '0x123',
            'pending'
        );
        expect(db.updateContractVerificationStatus).toHaveBeenCalledWith(
            1,
            1,
            '0x123',
            'success'
        );
        expect(db.storeContractData).toHaveBeenCalledWith(
            '123',
            'test',
            '0x123',
            expect.anything()
        );
    });

    it('Should append constructor arguments properly', async () => {
        jest.spyOn(db, 'getContractDeploymentTxByAddress').mockResolvedValueOnce({ data: '0x1234000abcd' });

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
            contractName: 'MyContract',
            constructorArguments: '000abcd'
        };

        await processContractVerification(db, message);
        expect(db.updateContractVerificationStatus).toHaveBeenCalledWith(
            1,
            1,
            '0x123',
            'pending'
        );
        expect(db.updateContractVerificationStatus).toHaveBeenCalledWith(
            1,
            1,
            '0x123',
            'success'
        );
        expect(db.storeContractData).toHaveBeenCalledWith(
            '123',
            'test',
            '0x123',
            expect.anything()
        );
    });

    it('Should set the verification status to failed if there is an error during the process', async () => {
        jest.spyOn(db, 'getContractDeploymentTxByAddress').mockRejectedValueOnce('Error!');

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

        await processContractVerification(db, message);
        expect(db.updateContractVerificationStatus).toHaveBeenCalledWith(
            1,
            1,
            '0x123',
            'pending'
        );
        expect(db.updateContractVerificationStatus).toHaveBeenCalledWith(
            1,
            1,
            '0x123',
            'failed'
        );
        expect(db.storeContractData).not.toHaveBeenCalled();
    });
});

const Helper = require('../helper');

jest.mock('../../lib/firebase', () => ({
    getUser: jest.fn(),
    updateContractVerificationStatus: jest.fn().mockResolvedValue(),
    getContractDeploymentTxByAddress: jest.fn().mockResolvedValue({
        data: '0x1234'
    })
}));
const {
    getUser,
    updateContractVerificationStatus,
    getContractDeploymentTxByAddress
} = require('../../lib/firebase');

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

const processContractVerification = require('../../pubsub/processContractVerification');

describe('processContractVerification', () => {
    beforeEach(()=> {
        helper = new Helper(process.env.GCLOUD_PROJECT);
        jest.clearAllMocks();
    });

    it('Should throw an error if there is no source code', async () => {
        const message = {
            json: {
                code: {}
            }
        };

        await expect(async () => {
            await processContractVerification(message); 
        }).rejects.toEqual('[processContractVerification] Missing sources');
    });

    it('Should set the verification status to success if source code is matching', async () => {
        const message = {
            json: {
                code: {
                    sources: { source: 'source' },
                    imports: { import: { contents: 'import' }}
                },
                publicExplorerParams: {
                    userId: '123',
                    workspace: 'test'
                },
                contractAddress: '0x123',
                contractName: 'MyContract'
            }
        };

        await processContractVerification(message);
        expect(updateContractVerificationStatus).toHaveBeenCalledWith(
            '123',
            'test',
            '0x123',
            'pending'
        );
        expect(updateContractVerificationStatus).toHaveBeenCalledWith(
            '123',
            'test',
            '0x123',
            'success'
        );
    });

    it('Should set the verification status to failed if source code is not matching', async () => {
        getContractDeploymentTxByAddress.mockResolvedValue({
            data: '0x56789'
        });

        const message = {
            json: {
                code: {
                    sources: { source: 'source' },
                    imports: { import: { contents: 'import' }}
                },
                publicExplorerParams: {
                    userId: '123',
                    workspace: 'test'
                },
                contractAddress: '0x123',
                contractName: 'MyContract'
            }
        };

        await processContractVerification(message);
        expect(updateContractVerificationStatus).toHaveBeenCalledWith(
            '123',
            'test',
            '0x123',
            'pending'
        );
        expect(updateContractVerificationStatus).toHaveBeenCalledWith(
            '123',
            'test',
            '0x123',
            'failed'
        );
    });

    it('Should link bytecode if libraries are passed', async () => {
        getContractDeploymentTxByAddress.mockResolvedValue({
            data: '0x1234abcd'
        });

        const message = {
            json: {
                code: {
                    sources: { source: 'source' },
                    imports: { import: { contents: 'import' }},
                    libraries: {
                        MyLibrary: '0xabcd'
                    }
                },
                publicExplorerParams: {
                    userId: '123',
                    workspace: 'test'
                },
                contractAddress: '0x123',
                contractName: 'MyContract'
            }
        };

        await processContractVerification(message);
        expect(updateContractVerificationStatus).toHaveBeenCalledWith(
            '123',
            'test',
            '0x123',
            'pending'
        );
        expect(updateContractVerificationStatus).toHaveBeenCalledWith(
            '123',
            'test',
            '0x123',
            'success'
        );
    });

    it('Should append constructor arguments properly', async () => {
        getContractDeploymentTxByAddress.mockResolvedValue({
            data: '0x1234000abcd'
        });

        const message = {
            json: {
                code: {
                    sources: { source: 'source' },
                    imports: { import: { contents: 'import' }}
                },
                publicExplorerParams: {
                    userId: '123',
                    workspace: 'test'
                },
                contractAddress: '0x123',
                contractName: 'MyContract',
                constructorArguments: '000abcd',
            }
        };

        await processContractVerification(message);
        expect(updateContractVerificationStatus).toHaveBeenCalledWith(
            '123',
            'test',
            '0x123',
            'pending'
        );
        expect(updateContractVerificationStatus).toHaveBeenCalledWith(
            '123',
            'test',
            '0x123',
            'success'
        );
    });

    it('Should set the verification status to failed if there is an error during the process', async () => {
        getContractDeploymentTxByAddress.mockRejectedValue('Error!');

        const message = {
            json: {
                code: {
                    sources: { source: 'source' },
                    imports: { import: { contents: 'import' }}
                },
                publicExplorerParams: {
                    userId: '123',
                    workspace: 'test'
                },
                contractAddress: '0x123',
                contractName: 'MyContract'
            }
        };

        await processContractVerification(message);
        expect(updateContractVerificationStatus).toHaveBeenCalledWith(
            '123',
            'test',
            '0x123',
            'pending'
        );
        expect(updateContractVerificationStatus).toHaveBeenCalledWith(
            '123',
            'test',
            '0x123',
            'failed'
        );
    });
});

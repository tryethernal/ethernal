import flushPromises from 'flush-promises';
import MockHelper from '../MockHelper';

jest.mock('@metamask/detect-provider');
import ContractVerificationInfo from '@/components/ContractVerificationInfo.vue';

let helper;
const stubs = [
    'Formatted-Sol-Var'
];

describe('ContractVerificationInfo.vue', () => {

    beforeEach(() => {
        jest.clearAllMocks();
        helper = new MockHelper();
    });

    it('Should display code / constructor arguments / libraries', async () => {
        const wrapper = helper.mountFn(ContractVerificationInfo, {
            propsData: {
                contract: {
                    bytecode: '0x60',
                    asm: 'abc',
                    abi: require('../fixtures/NFTCollectibleABI.json'),
                    verificationStatus: 'success',
                    verification: {
                        contractName: 'My Contract',
                        evmVersion: 'london',
                        compilerVersion: 'compiler',
                        runs: 200,
                        constructorArguments: '0000000000000000000000000000000000000000000000000000000000000040000000000000000000000000000000000000000000000000000000000000008000000000000000000000000000000000000000000000000000000000000000046162636400000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000008000000000000000000000000000000000000000000000000000000000000000c000000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000005000000000000000000000000000000000000000000000000000000000000000461626364000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000000000800000000000000000000000000000000000000000000000000000000000000001610000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000016200000000000000000000000000000000000000000000000000000000000000',
                        libraries: {
                            Library: '0x12345'
                        },
                        sources: [{ fileName: 'File.sol', content: 'i am solidity code' }]
                    }
                }
            },
            stubs: stubs,
            getters: {
                isPublicExplorer: jest.fn(() => true)
            }
        });

        await flushPromises();
        expect(wrapper.html()).toMatchSnapshot();
    });
});

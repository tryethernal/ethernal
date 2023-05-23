import flushPromises from 'flush-promises';
import MockHelper from '../MockHelper';

jest.mock('@metamask/detect-provider');
import ContractCode from '@/components/ContractCode.vue';

let helper;
const stubs = [
    'Contract-Verification',
    'Contract-Verification-Info'
];

describe('ContractCode.vue', () => {

    beforeEach(() => {
        jest.clearAllMocks();
        helper = new MockHelper();
    });

    it('Should display contract verification info if public explorer and verified', async () => {
        const wrapper = helper.mountFn(ContractCode, {
            propsData: {
                contract: {
                    bytecode: '0x60',
                    asm: 'abc',
                    abi: require('../fixtures/NFTCollectibleABI.json'),
                    verificationStatus: 'success',
                    verification: {
                        constructorArguments: '0000000000000000000000000000000000000000000000000000000000000040000000000000000000000000000000000000000000000000000000000000008000000000000000000000000000000000000000000000000000000000000000046162636400000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000008000000000000000000000000000000000000000000000000000000000000000c000000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000005000000000000000000000000000000000000000000000000000000000000000461626364000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000000000800000000000000000000000000000000000000000000000000000000000000001610000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000016200000000000000000000000000000000000000000000000000000000000000',
                        libraries: {
                            Library: '0x12345'
                        }
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

    it('Should display the contract verification panel for public explorers', async () => {
        const wrapper = helper.mountFn(ContractCode, {
            propsData: {
                contract: {
                    bytecode: '0x60',
                    asm: 'abc'
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

    it('Should not display the contract verification panel if not public explorer', async () => {
        const wrapper = helper.mountFn(ContractCode, {
            propsData: {
                contract: {
                    name: 'Contract',
                    patterns: [],
                    address: '0x123',
                    creationTransaction: '0xabc'
                }
            },
            stubs: stubs
        });

        await flushPromises();
        expect(wrapper.html()).toMatchSnapshot();
    });
});

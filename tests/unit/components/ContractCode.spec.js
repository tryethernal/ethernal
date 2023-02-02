import flushPromises from 'flush-promises';
import MockHelper from '../MockHelper';
import ethereum from '../mocks/ethereum';

jest.mock('@metamask/detect-provider');
import detectEthereumProvider from '@metamask/detect-provider';
import ContractCode from '@/components/ContractCode.vue';

let helper;
const stubs = [
    'Contract-Verification',
];

describe('ContractCode.vue', () => {

    beforeEach(() => {
        jest.clearAllMocks();
        helper = new MockHelper();
    });

    it('Should display the contract verification panel for public explorers', async () => {
        jest.spyOn(helper.mocks.server, 'getContract')
            .mockResolvedValueOnce({ data: {
                bytecode: '0x60',
                asm: 'abc'
            }});
        const wrapper = helper.mountFn(ContractCode, {
            propsData: {
                address: '0x123'
            },
            stubs: stubs,
            getters: {
                isPublicExplorer: jest.fn(() => true)
            }
        });

        await flushPromises();
        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should not display the contract verification panel if not public explorer', async () => {
        jest.spyOn(helper.mocks.server, 'getContract')
            .mockResolvedValueOnce({ data: {
                name: 'Contract',
                patterns: [],
                address: '0x123',
                creationTransaction: '0xabc'
            }});
        const wrapper = helper.mountFn(ContractCode, {
            propsData: {
                address: '0x123'
            },
            stubs: stubs
        });

        await flushPromises();
        expect(wrapper.html()).toMatchSnapshot();
    });
});

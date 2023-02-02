import flushPromises from 'flush-promises';
import MockHelper from '../MockHelper';
import ethereum from '../mocks/ethereum';
import AmalfiContract from '../fixtures/AmalfiContract.json';

jest.mock('@metamask/detect-provider');
import detectEthereumProvider from '@metamask/detect-provider';
import ContractInteraction from '@/components/ContractInteraction.vue';

let helper;
const stubs = [
    'Import-Artifact-Modal',
    'Contract-Call-Options',
    'Contract-Read-Method',
    'Contract-Write-Method'
];

describe('ContractInteraction.vue', () => {

    beforeEach(() => {
        jest.clearAllMocks();
        helper = new MockHelper();
    });

    it('Should display ABI editor & methods', async () => {
        jest.spyOn(helper.mocks.server, 'getContract')
            .mockResolvedValueOnce({ data: {
                name: 'Amalfi',
                abi: AmalfiContract.artifact.abi
            }});
        const wrapper = helper.mountFn(ContractInteraction, {
            propsData: {
                address: '0x123'
            },
            stubs: stubs
        });

        await flushPromises();
        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should display ABI uploader', async () => {
        jest.spyOn(helper.mocks.server, 'getContract')
            .mockResolvedValueOnce({ data: {
                address: '0x123'
            }});
        const wrapper = helper.mountFn(ContractInteraction, {
            propsData: {
                address: '0x123'
            },
            stubs: stubs
        });

        await flushPromises();
        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should display verified contract', async () => {
        jest.spyOn(helper.mocks.server, 'getContract')
            .mockResolvedValueOnce({ data: {
                verificationStatus: 'success',
                address: '0x123',
                name: 'Amalfi',
                abi: AmalfiContract.artifact.abi
            }});
        const wrapper = helper.mountFn(ContractInteraction, {
            propsData: {
                address: '0x123'
            },
            stubs: stubs,
            getters: {
                isUserAdmin: jest.fn(() => false)
            }
        });

        await flushPromises();
        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should display unverified contract', async () => {
        jest.spyOn(helper.mocks.server, 'getContract')
            .mockResolvedValueOnce({ data: {
                verificationStatus: null,
                address: '0x123',
            }});
        const wrapper = helper.mountFn(ContractInteraction, {
            propsData: {
                address: '0x123'
            },
            stubs: stubs,
            getters: {
                isUserAdmin: jest.fn(() => false)
            }
        });

        await flushPromises();
        expect(wrapper.html()).toMatchSnapshot();
    });
});

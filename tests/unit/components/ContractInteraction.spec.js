import flushPromises from 'flush-promises';
import AmalfiContract from '../fixtures/AmalfiContract.json';

vi.mock('@metamask/detect-provider');
import ContractInteraction from '@/components/ContractInteraction.vue';

const stubs = [
    'Import-Artifact-Modal',
    'Contract-Call-Options',
    'Contract-Read-Method',
    'Contract-Write-Method'
];

describe('ContractInteraction.vue', () => {
    it('Should display ABI editor & methods', async () => {
        vi.spyOn(server, 'getContract')
            .mockResolvedValueOnce({ data: {
                name: 'Amalfi',
                abi: AmalfiContract.artifact.abi
            }});
        const wrapper = mount(ContractInteraction, {
            props: {
                address: '0x123'
            },
            global: {
                stubs
            }
        });

        await flushPromises();
        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should display ABI uploader', async () => {
        vi.spyOn(server, 'getContract')
            .mockResolvedValueOnce({ data: {
                address: '0x123'
            }});
        const wrapper = mount(ContractInteraction, {
            props: {
                address: '0x123'
            },
            global: {
                stubs
            }
        });

        await flushPromises();
        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should display verified contract', async () => {
        vi.spyOn(server, 'getContract')
            .mockResolvedValueOnce({ data: {
                verificationStatus: 'success',
                address: '0x123',
                name: 'Amalfi',
                abi: AmalfiContract.artifact.abi
            }});
        const wrapper = mount(ContractInteraction, {
            props: {
                address: '0x123'
            },
            global: {
                stubs,
                plugins: [createTestingPinia({ initialState: { user: { isAdmin: false } } })]
            }
        });

        await flushPromises();
        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should display unverified contract', async () => {
        vi.spyOn(server, 'getContract')
            .mockResolvedValueOnce({ data: {
                verificationStatus: null,
                address: '0x123',
            }});
        const wrapper = mount(ContractInteraction, {
            props: {
                address: '0x123'
            },
            global: {
                stubs,
                plugins: [createTestingPinia({ initialState: { user: { isAdmin: false } } })]
            }
        });

        await flushPromises();
        expect(wrapper.html()).toMatchSnapshot();
    });
});

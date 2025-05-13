import ContractCallOptions from '@/components/ContractCallOptions.vue';
import { useCurrentWorkspaceStore } from '@/stores/currentWorkspace';
import { useWalletStore } from '@/stores/walletStore';
import { useUserStore } from '@/stores/user';
import { nextTick } from 'vue';

const stubs = ['WalletConnectorMirror', 'HashLink'];

describe('ContractCallOptions.vue', () => {
    const mockAccount = {
        address: '0x123',
        raw: {
            address: '0x123',
            privateKey: '0xabc'
        }
    };

    const mockAccountNoPrivateKey = {
        address: '0x456',
        raw: {
            address: '0x456'
        }
    };

    const createWrapper = (props = {}) => {
        return mount(ContractCallOptions, {
            props: {
                accounts: [],
                loading: false,
                ...props
            },
            global: {
                stubs,
                plugins: [createTestingPinia({
                    createSpy: vi.fn,
                    initialState: {
                        currentWorkspace: {
                            gasLimit: '100000',
                            gasPrice: '1000',
                            defaultAccount: null
                        },
                        wallet: {
                            connectedAddress: null
                        },
                        user: {
                            isAdmin: true
                        }
                    }
                })]
            }
        });
    };

    it('Should show info alert when no accounts and is admin', async () => {
        const wrapper = createWrapper();
        await flushPromises();

        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should not show info alert when not admin', async () => {
        const wrapper = createWrapper();
        const userStore = useUserStore();
        userStore.isAdmin = false;
        await flushPromises();

        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should show metamask by default when no accounts', async () => {
        const wrapper = createWrapper();
        await flushPromises();

        expect(wrapper.vm.mode).toBe('metamask');
        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should show accounts mode with account list when accounts provided', async () => {
        const wrapper = createWrapper({
            accounts: [mockAccount, mockAccountNoPrivateKey]
        });
        await flushPromises();

        expect(wrapper.vm.mode).toBe('accounts');
        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should emit senderSourceChanged when mode changes', async () => {
        const wrapper = createWrapper({
            accounts: [mockAccount]
        });
        await flushPromises();

        // Clear initial emissions
        wrapper.emitted('senderSourceChanged').length = 0;
        
        await wrapper.find('a:nth-child(2)').trigger('click');
        
        expect(wrapper.emitted('senderSourceChanged')).toBeTruthy();
        expect(wrapper.emitted('senderSourceChanged')[0]).toEqual(['metamask']);
    });

    it('Should emit callOptionChanged when form values change', async () => {
        const wrapper = createWrapper({
            accounts: [mockAccount]
        });
        await flushPromises();
        
        // Clear initial emissions
        wrapper.emitted('callOptionChanged').length = 0;
        
        // Update the gas limit directly
        wrapper.vm.gasLimit = '200000';
        await nextTick();
        
        expect(wrapper.emitted('callOptionChanged')).toBeTruthy();
        const emittedCalls = wrapper.emitted('callOptionChanged');
        const lastEmittedCall = emittedCalls[emittedCalls.length - 1][0];
        expect(lastEmittedCall.gasLimit).toBe('200000');
    });

    it('Should show connected address when in metamask mode and address is connected', async () => {
        const wrapper = createWrapper();
        const walletStore = useWalletStore();
        walletStore.connectedAddress = '0x789';
        await flushPromises();

        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should initialize with default account if set in workspace store', async () => {
        const wrapper = createWrapper({
            accounts: [mockAccount]
        });
        const workspaceStore = useCurrentWorkspaceStore();
        workspaceStore.defaultAccount = '0x123';
        await flushPromises();

        expect(wrapper.vm.from).toEqual(mockAccount);
        expect(wrapper.html()).toMatchSnapshot();
    });
});

import PublicExplorerFooter from '@/components/PublicExplorerFooter.vue';
import { createTestingPinia } from '@pinia/testing';

describe('PublicExplorerFooter.vue', () => {
    const host = 'test.ethernal.com';
    const mockEnvStore = {
        version: '1.2.3',
        mainDomain: 'ethernal.com'
    };
    const mockCurrentWorkspaceStore = {
        networkId: '0x1',
        name: 'Test Network',
        chain: {
            token: 'ETH'
        },
        rpcServer: 'https://test.rpc'
    };

    beforeEach(() => {
        // Mock document.location
        Object.defineProperty(window, 'location', {
            value: { host },
            writable: true
        });
    });

    it('Should show the component', async () => {
        const wrapper = mount(PublicExplorerFooter, {
            global: {
                plugins: [
                    createTestingPinia({
                        initialState: {
                            env: mockEnvStore,
                            currentWorkspace: mockCurrentWorkspaceStore
                        }
                    })
                ]
            }
        });
        await flushPromises();

        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should try to add network to metamask when clicking the button', async () => {
        const mockRequest = vi.fn();
        global.window.ethereum = {
            request: mockRequest
        };

        const wrapper = mount(PublicExplorerFooter, {
            global: {
                plugins: [
                    createTestingPinia({
                        initialState: {
                            env: mockEnvStore,
                            currentWorkspace: mockCurrentWorkspaceStore
                        }
                    })
                ]
            }
        });
        await flushPromises();

        await wrapper.find('button').trigger('click');

        expect(mockRequest).toHaveBeenCalledWith({
            method: 'wallet_addEthereumChain',
            params: [{
                chainId: mockCurrentWorkspaceStore.networkId,
                chainName: mockCurrentWorkspaceStore.name,
                nativeCurrency: {
                    name: mockCurrentWorkspaceStore.chain.token,
                    symbol: mockCurrentWorkspaceStore.chain.token,
                    decimals: 18
                },
                rpcUrls: [mockCurrentWorkspaceStore.rpcServer],
                blockExplorerUrls: [`https://app.${mockEnvStore.mainDomain}`]
            }]
        });
    });

    it('Should not try to add network to metamask when ethereum is not available', async () => {
        global.window.ethereum = undefined;
        const consoleSpy = vi.spyOn(console, 'error');

        const wrapper = mount(PublicExplorerFooter, {
            global: {
                plugins: [
                    createTestingPinia({
                        initialState: {
                            env: mockEnvStore,
                            currentWorkspace: mockCurrentWorkspaceStore
                        }
                    })
                ]
            }
        });
        await flushPromises();

        await wrapper.find('button').trigger('click');

        expect(consoleSpy).not.toHaveBeenCalled();
    });

    it('Should handle errors when adding network', async () => {
        const mockRequest = vi.fn().mockRejectedValue(new Error('Failed'));
        const consoleSpy = vi.spyOn(console, 'error');
        global.window.ethereum = {
            request: mockRequest
        };

        const wrapper = mount(PublicExplorerFooter, {
            global: {
                plugins: [
                    createTestingPinia({
                        initialState: {
                            env: mockEnvStore,
                            currentWorkspace: mockCurrentWorkspaceStore
                        }
                    })
                ]
            }
        });
        await flushPromises();

        await wrapper.find('button').trigger('click');

        expect(consoleSpy).toHaveBeenCalledWith('Failed to add network to MetaMask:', expect.any(Error));
    });
}); 
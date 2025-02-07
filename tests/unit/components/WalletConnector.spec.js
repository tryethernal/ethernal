import { useWalletStore } from '@/stores/walletStore';

describe('WalletConnector.vue', () => {
    it('Should wallet connection button', async () => {
        vi.doMock('@web3-onboard/vue', () => ({
            init: vi.fn().mockReturnValue({
                state: {
                    select: vi.fn().mockReturnValue({
                        subscribe: vi.fn()
                    })
                }
            }),
            useOnboard: vi.fn().mockReturnValue({
                alreadyConnectedWallets: []
            })
        }));

        const { default: WalletConnector } = await import('@/components/WalletConnector.vue');

        const pinia = createTestingPinia({
            initialState: {
                wallet: { isConnectorLoading: false },
                currentWorkspace: { wagmiConfig: {}}
            }
        });

        const wrapper = mount(WalletConnector, {
            global: {
                plugins: [pinia]
            }
        });

        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should show a loading state', async () => {
        vi.doMock('@web3-onboard/vue', () => ({
            init: vi.fn().mockReturnValue({
                state: {
                    select: vi.fn()
                        .mockReturnValue({ subscribe: vi.fn() })
                }
            }),
            useOnboard: vi.fn().mockReturnValue({
                alreadyConnectedWallets: []
            })
        }));

        const { default: WalletConnector } = await import('@/components/WalletConnector.vue');

        const pinia = createTestingPinia({
            initialState: {
                wallet: { isConnectorLoading: true },
                currentWorkspace: { wagmiConfig: {}}
            }
        });

        const wrapper = mount(WalletConnector, {
            global: {
                plugins: [pinia]
            }
        });

        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should show the address & balance', async () => {
        vi.doMock('@web3-onboard/vue', () => ({
            init: vi.fn().mockReturnValue({
                state: {
                    select: vi.fn().mockReturnValue({
                        subscribe: vi.fn(cb => cb([]))
                    }),
                    get: vi.fn().mockReturnValue({
                        wagmiConfig: {}
                    })
                }
            }),
            useOnboard: vi.fn().mockReturnValue({
                alreadyConnectedWallets: [],
                connectedWallet: {
                    wagmiConnector: {}
                }
            })
        }));

        const { default: WalletConnector } = await import('@/components/WalletConnector.vue');

        const pinia = createTestingPinia({
            initialState: {
                wallet: {
                    isConnectorLoading: false,
                    connectedAddress: '0x1bF85ED48fcda98e2c7d08E4F2A8083fb18792AA',
                },
                currentWorkspace: {
                    wagmiConfig: {}
                }
            }
        });

        const walletStore = useWalletStore(pinia);
        walletStore.formattedBalance = '1 ETH';
        walletStore.isChainIdCorrect = true;

        const wrapper = mount(WalletConnector, {
            global: {
                plugins: [pinia]
            }
        });

        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should show an invalid network warning', async () => {
        vi.doMock('@web3-onboard/vue', () => ({
            init: vi.fn().mockReturnValue({
                state: {
                    select: vi.fn().mockReturnValue({
                        subscribe: vi.fn(cb => cb([]))
                    }),
                    get: vi.fn().mockReturnValue({
                        wagmiConfig: {}
                    })
                }
            }),
            useOnboard: vi.fn().mockReturnValue({
                alreadyConnectedWallets: [],
                connectedWallet: {
                    wagmiConnector: {}
                }
            })
        }));

        const { default: WalletConnector } = await import('@/components/WalletConnector.vue');

        const pinia = createTestingPinia({
            initialState: {
                wallet: {
                    isConnectorLoading: false,
                    connectedAddress: '0x1bF85ED48fcda98e2c7d08E4F2A8083fb18792AA',
                },
                currentWorkspace: {
                    wagmiConfig: {}
                }
            }
        });

        const walletStore = useWalletStore(pinia);
        walletStore.formattedBalance = '1 ETH';
        walletStore.isChainIdCorrect = false;

        const wrapper = mount(WalletConnector, {
            global: {
                plugins: [pinia]
            }
        });

        expect(wrapper.html()).toMatchSnapshot();
    });
});

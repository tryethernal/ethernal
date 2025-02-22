import flushPromises from 'flush-promises';
const stubs = ['Hash-Link', 'Wallet-Connector-Mirror']

describe('TokenBalanceCard.vue', () => {
    it('Should show token balance', async () => {
        vi.doMock('@web3-onboard/wagmi', () => ({
            readContract: vi.fn().mockResolvedValueOnce(1n)
        }));

        const { default: TokenBalanceCard } = await import('@/components/TokenBalanceCard.vue');

        const pinia = createTestingPinia({
            initialState: {
                wallet: {},
                currentWorkspace: { wagmiConfig: {}}
            }
        });

        const wrapper = mount(TokenBalanceCard, {
            props: {
                contract: {
                    tokenSymbol: 'ETH',
                    tokenDecimals: 18
                }
            },
            global: {
                stubs,
                plugins: [pinia]
            }
        });

        pinia.state.value.wallet.connectedAddress = '0x1234';
        await flushPromises();

        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should show a loader', async () => {
        vi.doMock('@web3-onboard/wagmi', () => ({
            readContract: vi.fn().mockResolvedValueOnce(1n)
        }));

        const { default: TokenBalanceCard } = await import('@/components/TokenBalanceCard.vue');

        const pinia = createTestingPinia({
            initialState: {
                wallet: { isConnectorLoading: true },
                currentWorkspace: { wagmiConfig: {}}
            }
        });

        const wrapper = mount(TokenBalanceCard, {
            props: {
                contract: {
                    tokenSymbol: 'ETH',
                    tokenDecimals: 18
                }
            },
            global: {
                stubs,
                plugins: [pinia]
            }
        });

        await flushPromises();

        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should show the wallet connector', async () => {
        vi.doMock('@web3-onboard/wagmi', () => ({
            readContract: vi.fn().mockResolvedValueOnce(1n)
        }));

        const { default: TokenBalanceCard } = await import('@/components/TokenBalanceCard.vue');

        const pinia = createTestingPinia({
            initialState: {
                wallet: {},
                currentWorkspace: { wagmiConfig: {}}
            }
        });

        const wrapper = mount(TokenBalanceCard, {
            props: {
                contract: {
                    tokenSymbol: 'ETH',
                    tokenDecimals: 18
                }
            },
            global: {
                stubs,
                plugins: [pinia]
            }
        });

        await flushPromises();

        expect(wrapper.html()).toMatchSnapshot();
    });
});

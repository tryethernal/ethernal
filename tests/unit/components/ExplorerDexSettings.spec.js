import flushPromises from 'flush-promises';

import ExplorerDexSettings from '@/components/ExplorerDexSettings.vue';

const stubs = ['Create-Explorer-Dex-Modal', 'Explorer-Dex-Settings-Danger-Zone', 'Hash-Link'];

describe('ExplorerDexSettings.vue', () => {
    it('Should display help screen if no dex', async () => {
        vi.spyOn(server, 'getExplorer').mockResolvedValueOnce({
            data: {
                stripeSubscription: {},
                v2Dex: null
            }
        });
        const wrapper = mount(ExplorerDexSettings, {
            props: {
                explorerId: 1
            },
            global: {
                stubs
            }
        });
        await flushPromises();

        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should display message if no subscription', async () => {
        vi.spyOn(server, 'getExplorer').mockResolvedValueOnce({
            data: {
                stripeSubscription: null,
                v2Dex: {
                    active: true,
                    routerAddress: '0x123',
                    factoryAddress: '0x456',
                    wrappedNativeTokenContract: {
                        address: '0x789',
                        tokenSymbol: 'WETH',
                        tokenName: 'Wrapped Ether',
                        tokenDecimals: 18
                    }
                }
            }
        });
        vi.spyOn(server, 'getV2DexStatus').mockResolvedValueOnce({
            data: {
                pairCount: 10,
                totalPairs: 10
            }
        });
        const wrapper = mount(ExplorerDexSettings, {
            props: {
                explorerId: 1
            },
            global: {
                stubs
            }
        });
        await flushPromises();

        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should display syncing dex', async () => {
        vi.spyOn(server, 'getExplorer').mockResolvedValueOnce({
            data: {
                stripeSubscription: {},
                v2Dex: {
                    active: true,
                    routerAddress: '0x123',
                    factoryAddress: '0x456',
                    wrappedNativeTokenContract: {
                        address: '0x789',
                        tokenSymbol: 'WETH',
                        tokenName: 'Wrapped Ether',
                        tokenDecimals: 18
                    }
                }
            }
        });
        vi.spyOn(server, 'getV2DexStatus').mockResolvedValueOnce({
            data: {
                pairCount: 8,
                totalPairs: 10
            }
        });
        const wrapper = mount(ExplorerDexSettings, {
            props: {
                explorerId: 1
            },
            global: {
                stubs
            }
        });
        await flushPromises();

        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should display limited sync', async () => {
        vi.spyOn(server, 'getExplorer').mockResolvedValueOnce({
            data: {
                stripeSubscription: {
                    isTrialing: true
                },
                v2Dex: {
                    active: true,
                    routerAddress: '0x123',
                    factoryAddress: '0x456',
                    wrappedNativeTokenContract: {
                        address: '0x789',
                        tokenSymbol: 'WETH',
                        tokenName: 'Wrapped Ether',
                        tokenDecimals: 18
                    }
                }
            }
        });
        vi.spyOn(server, 'getV2DexStatus').mockResolvedValueOnce({
            data: {
                pairCount: 8,
                totalPairs: 10
            }
        });
        const wrapper = mount(ExplorerDexSettings, {
            props: {
                explorerId: 1
            },
            global: {
                stubs
            }
        });
        await flushPromises();

        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should display fully synced active dex settings', async () => {
        vi.spyOn(server, 'getExplorer').mockResolvedValueOnce({
            data: {
                stripeSubscription: {},
                v2Dex: {
                    active: true,
                    routerAddress: '0x123',
                    factoryAddress: '0x456',
                    wrappedNativeTokenContract: {
                        address: '0x789',
                        tokenSymbol: 'WETH',
                        tokenName: 'Wrapped Ether',
                        tokenDecimals: 18
                    }
                }
            }
        });
        vi.spyOn(server, 'getV2DexStatus').mockResolvedValueOnce({
            data: {
                pairCount: 10,
                totalPairs: 10
            }
        });
        const wrapper = mount(ExplorerDexSettings, {
            props: {
                explorerId: 1
            },
            global: {
                stubs
            }
        });
        await flushPromises();

        expect(wrapper.html()).toMatchSnapshot();
    });
});

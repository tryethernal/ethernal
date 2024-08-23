import flushPromises from 'flush-promises';
import MockHelper from '../MockHelper';

import ExplorerDexSettings from '@/components/ExplorerDexSettings.vue';

let helper;
const stubs = ['Create-Explorer-Dex-Modal', 'Explorer-Dex-Settings-Danger-Zone', 'Hash-Link'];

beforeEach(() => {
    jest.clearAllMocks()
    helper = new MockHelper();
});

describe('ExplorerDexSettings.vue', () => {
    it('Should display help screen if no dex', async () => {
        jest.spyOn(helper.mocks.server, 'getExplorer').mockResolvedValueOnce({
            data: {
                stripeSubscription: {},
                v2Dex: null
            }
        });
        const wrapper = helper.mountFn(ExplorerDexSettings, {
            propsData: {
                explorerId: 1
            },
            stubs
        });
        await flushPromises();

        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should display message if no subscription', async () => {
        jest.spyOn(helper.mocks.server, 'getExplorer').mockResolvedValueOnce({
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
        jest.spyOn(helper.mocks.server, 'getV2DexStatus').mockResolvedValueOnce({
            data: {
                pairCount: 10,
                totalPairs: 10
            }
        });
        const wrapper = helper.mountFn(ExplorerDexSettings, {
            propsData: {
                explorerId: 1
            },
            stubs
        });
        await flushPromises();

        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should display syncing dex', async () => {
        jest.spyOn(helper.mocks.server, 'getExplorer').mockResolvedValueOnce({
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
        jest.spyOn(helper.mocks.server, 'getV2DexStatus').mockResolvedValueOnce({
            data: {
                pairCount: 8,
                totalPairs: 10
            }
        });
        const wrapper = helper.mountFn(ExplorerDexSettings, {
            propsData: {
                explorerId: 1
            },
            stubs
        });
        await flushPromises();

        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should display limited sync', async () => {
        jest.spyOn(helper.mocks.server, 'getExplorer').mockResolvedValueOnce({
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
        jest.spyOn(helper.mocks.server, 'getV2DexStatus').mockResolvedValueOnce({
            data: {
                pairCount: 8,
                totalPairs: 10
            }
        });
        const wrapper = helper.mountFn(ExplorerDexSettings, {
            propsData: {
                explorerId: 1
            },
            stubs
        });
        await flushPromises();

        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should display fully synced active dex settings', async () => {
        jest.spyOn(helper.mocks.server, 'getExplorer').mockResolvedValueOnce({
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
        jest.spyOn(helper.mocks.server, 'getV2DexStatus').mockResolvedValueOnce({
            data: {
                pairCount: 10,
                totalPairs: 10
            }
        });
        const wrapper = helper.mountFn(ExplorerDexSettings, {
            propsData: {
                explorerId: 1
            },
            stubs
        });
        await flushPromises();

        expect(wrapper.html()).toMatchSnapshot();
    });
});

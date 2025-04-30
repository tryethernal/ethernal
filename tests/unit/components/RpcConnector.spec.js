import { h } from 'vue';
import { VApp } from 'vuetify/components';
import flushPromises from 'flush-promises';

vi.mock('@/plugins/firebase', () => ({
    default: vi.fn(),
    auth: vi.fn()
}));
vi.mock('vue-router', () => ({
    useRoute: vi.fn(() => ({ path: '/transactions' }))
}))

import { auth } from '@/plugins/firebase';

import RpcConnector from '@/components/RpcConnector.vue';

const stubs = ['WalletConnector', 'SearchBar', 'ThemeToggle'];

describe('RpcConnector.vue', () => {
    beforeEach(() => {
        vi.spyOn(server, 'processFailedTransactions').mockResolvedValue();
        vi.spyOn(server, 'getFailedProcessableTransactions').mockResolvedValue({ data: [] });
        vi.spyOn(server, 'getProcessableTransactions').mockResolvedValue({ data: [] });
    });

    it('Should display gas info when gas analytics is enabled', async () => {
        vi.spyOn(server, 'getBlocks').mockResolvedValue({ data: { items: [] }});
        vi.spyOn(pusher, 'onNewBlockEvent').mockImplementation((callback) => {
            callback({ gasPrice: 1000000000n }); // 1 gwei
        });
        const wrapper = mount(VApp, {
            slots: {
                default: h(RpcConnector)
            },
            global: {
                stubs,
                mocks: {
                    $route: {
                        path: '/transactions'
                    }
                },
                plugins: [createTestingPinia({
                    initialState: {
                        currentWorkspace: {
                            name: 'Hardhat',
                            rpcServer: 'http://localhost:8545',
                            currentBlock: { number: 1 },
                            public: false
                        },
                        explorer: { id: 1, gasAnalyticsEnabled: true },
                        env: { isAdmin: true }
                    }
                })]
            }
        });

        await flushPromises();

        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should display the correct info', async () => {
        auth.mockReturnValue({ currentUser: { id: '1' }});
        vi.spyOn(server, 'getBlocks').mockResolvedValue({ data: { items: [] }});
        vi.spyOn(server, 'getRpcAccounts').mockResolvedValue(['0x123']);
        const getAccountsMock = vi.spyOn(server, 'getAccounts').mockResolvedValue({ data: { items: [{ address: '0x123' }, { address: '0x456' }]}});
        vi.spyOn(server, 'getAccountBalance').mockResolvedValue('1000000000000000000000');

        const onNewContractMock = vi.spyOn(pusher, 'onNewContract');
        const processContractMock = vi.spyOn(server, 'processContracts').mockResolvedValue();
        const wrapper = mount(VApp, {
            slots: {
                default: h(RpcConnector)
            },
            global: {
                stubs,
                mocks: {
                    $route: {
                        path: '/transactions'
                    }
                },
                plugins: [createTestingPinia({
                    initialState: {
                        currentWorkspace: {
                            name: 'Hardhat',
                            rpcServer: 'http://localhost:8545',
                            currentBlock: { number: 1 },
                            public: false
                        },
                        user: { isAdmin: true },
                        env: { isAdmin: true }
                    }
                })]
            }
        });
        await flushPromises();

        expect(onNewContractMock).toHaveBeenCalled();
        expect(getAccountsMock).toHaveBeenCalled();
        expect(processContractMock).toHaveBeenCalled();
        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should not do private operations when in public explorer mode', async () => {
        auth.mockReturnValue({ currentUser: { id: '1' }});
        vi.spyOn(server, 'getBlocks').mockResolvedValue({ data: { items: [] }});

        const onNewContractMock = vi.spyOn(pusher, 'onNewContract');
        const processContractsMock = vi.spyOn(server, 'processContracts').mockResolvedValue();
        const wrapper = mount(VApp, {
            slots: {
                default: h(RpcConnector)
            },
            attachTo: document.body,
            global: {
                stubs,
                mocks: {
                    $route: {
                        path: '/transactions'
                    }
                },
                plugins: [createTestingPinia({
                    initialState: {
                        currentWorkspace: {
                            name: 'Hardhat',
                            rpcServer: 'http://localhost:8545',
                            public: true,
                            currentBlock: { number: 1 }
                        },
                        explorer: { id: 1, gasAnalyticsEnabled: true }
                    }
                })]
            }
        });

        await flushPromises();

        expect(onNewContractMock).not.toHaveBeenCalled();
        expect(processContractsMock).not.toHaveBeenCalled();
        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should emit toggleMenu event when nav icon is clicked on mobile', async () => {
        vi.spyOn(server, 'getBlocks').mockResolvedValue({ data: { items: [] }});
        const wrapper = mount(VApp, {
            slots: {
                default: h(RpcConnector)
            },
            global: {
                stubs,
                mocks: {
                    $route: {
                        path: '/transactions'
                    },
                    $vuetify: {
                        display: {
                            mobile: true
                        }
                    }
                },
                plugins: [createTestingPinia({
                    initialState: {
                        currentWorkspace: {
                            name: 'Hardhat',
                            rpcServer: 'http://localhost:8545',
                            currentBlock: { number: 1 },
                            public: false
                        }
                    }
                })]
            }
        });

        await flushPromises();
        
        const navIcon = wrapper.find('.v-app-bar-nav-icon');
        await navIcon.trigger('click');

        const emitted = wrapper.findComponent(RpcConnector).emitted();
        expect(emitted.toggleMenu).toBeTruthy();
        expect(wrapper.html()).toMatchSnapshot();
    });
});

import OverviewStats from '@/components/OverviewStats.vue';

const stubs = ['StatNumber'];

describe('OverviewStats.vue', () => {
    beforeEach(() => {
        vi.spyOn(server, 'getActiveWalletCount').mockResolvedValueOnce({ data: { count: 100 } });
        vi.spyOn(server, 'getTxCountTotal').mockResolvedValueOnce({ data: { count: 1000 } });
        vi.spyOn(server, 'getTxCount24h').mockResolvedValueOnce({ data: { count: 50 } });
    });

    it('Should show the component with all stats', async () => {
        const fromWei = vi.fn().mockReturnValue('1.0 ETH');
        const wrapper = mount(OverviewStats, {
            global: {
                stubs,
                provide: {
                    $fromWei: fromWei
                },
                plugins: [createTestingPinia({
                    initialState: {
                        currentWorkspace: {
                            currentBlock: {
                                number: 12345
                            }
                        },
                        explorer: {
                            totalSupply: '1000000000000000000',
                            token: {
                                symbol: 'ETH',
                                decimals: 18
                            }
                        }
                    }
                })]
            }
        });
        await flushPromises();

        expect(wrapper.html()).toMatchSnapshot();
        expect(fromWei).toHaveBeenCalledWith('1000000000000000000', 'ether', { symbol: 'ETH', decimals: 18 });
    });

    it('Should show loading state while fetching data', async () => {
        const fromWei = vi.fn().mockReturnValue('0.0 ETH');
        const wrapper = mount(OverviewStats, {
            global: {
                stubs,
                provide: {
                    $fromWei: fromWei
                },
                plugins: [createTestingPinia({
                    initialState: {
                        currentWorkspace: {
                            currentBlock: {
                                number: 0
                            }
                        },
                        explorer: {
                            totalSupply: '0',
                            token: {
                                symbol: 'ETH',
                                decimals: 18
                            }
                        }
                    }
                })]
            }
        });

        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should handle server errors gracefully', async () => {
        vi.spyOn(server, 'getActiveWalletCount').mockRejectedValueOnce(new Error('Server error'));
        vi.spyOn(server, 'getTxCountTotal').mockRejectedValueOnce(new Error('Server error'));
        vi.spyOn(server, 'getTxCount24h').mockRejectedValueOnce(new Error('Server error'));

        const fromWei = vi.fn().mockReturnValue('1.0 ETH');
        const wrapper = mount(OverviewStats, {
            global: {
                stubs,
                provide: {
                    $fromWei: fromWei
                },
                plugins: [createTestingPinia({
                    initialState: {
                        currentWorkspace: {
                            currentBlock: {
                                number: 12345
                            }
                        },
                        explorer: {
                            totalSupply: '1000000000000000000',
                            token: {
                                symbol: 'ETH',
                                decimals: 18
                            }
                        }
                    }
                })]
            }
        });
        await flushPromises();

        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should not show total supply when not available', async () => {
        const fromWei = vi.fn().mockReturnValue('0.0 ETH');
        const wrapper = mount(OverviewStats, {
            global: {
                stubs,
                provide: {
                    $fromWei: fromWei
                },
                plugins: [createTestingPinia({
                    initialState: {
                        currentWorkspace: {
                            currentBlock: {
                                number: 12345
                            }
                        },
                        explorer: {
                            totalSupply: null,
                            token: {
                                symbol: 'ETH',
                                decimals: 18
                            }
                        }
                    }
                })]
            }
        });
        await flushPromises();

        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should hide dividers correctly on different screen sizes', async () => {
        const fromWei = vi.fn().mockReturnValue('1.0 ETH');
        const wrapper = mount(OverviewStats, {
            global: {
                stubs,
                provide: {
                    $fromWei: fromWei
                },
                plugins: [createTestingPinia({
                    initialState: {
                        currentWorkspace: {
                            currentBlock: {
                                number: 12345
                            }
                        },
                        explorer: {
                            totalSupply: '1000000000000000000',
                            token: {
                                symbol: 'ETH',
                                decimals: 18
                            }
                        }
                    }
                })]
            }
        });
        await flushPromises();

        expect(wrapper.html()).toMatchSnapshot();
    });
}); 
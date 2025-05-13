import '../mocks/ethers';
import flushPromises from 'flush-promises';

import ExplorerFaucet from '@/components/ExplorerFaucet.vue';

describe('ExplorerFaucet.vue', () => {
    const stubs = ['Hash-Link', 'Explorer-Faucet-Analytics', 'Explorer-Faucet-Transaction-History']

    it('Should let admin create a faucet', async () => {
        const wrapper = mount(ExplorerFaucet, {
            global: {
                stubs,
                plugins: [createTestingPinia({
                    initialState: {
                        user: { isAdmin: true },
                        explorer: {
                            id: 1
                        }
                    }
                })]
            }
        });
        await flushPromises();

        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should display faucet intro', async () => {
        const wrapper = mount(ExplorerFaucet, {
            global: {
                stubs,
                plugins: [createTestingPinia({
                    initialState: {
                        explorer: {
                            id: 1
                        }
                    }
                })]
            }
        });
        await flushPromises();

        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should display an active faucet', async () => {
        vi.spyOn(server, 'getFaucetBalance').mockResolvedValueOnce({ data: { balance: '2000000000000000000' }});
        vi.spyOn(Storage.prototype, 'getItem').mockReturnValueOnce(JSON.stringify([
            { address: '0x4150e51980114468aa8309bb72f027d8bff41353', availableAt: '2024-06-16T19:04:34.769Z' },
            { address: '0x4150e51980114468aa8309bb72f027d8bff41353', availableAt: '2024-06-16T19:04:34.769Z' },
            { address: '0x4150e51980114468aa8309bb72f027d8bff41353', availableAt: '2024-06-16T19:04:34.769Z' },
            { address: '0x4150e51980114468aa8309bb72f027d8bff41353', availableAt: '2024-06-17T19:04:34.769Z' },
            { address: '0x4150e51980114468aa8309bb72f027d8bff41353', availableAt: '2024-06-17T19:04:34.769Z' },
            { address: '0x4150e51980114468aa8309bb72f027d8bff41353', availableAt: '2024-06-17T19:04:34.769Z' }
        ]));
        const wrapper = mount(ExplorerFaucet, {
            global: {
                stubs,
                plugins: [createTestingPinia({
                    initialState: {
                        explorer: {
                            token: 'ETL',
                            faucet: {
                                id: 1,
                                active: true,
                                address: '0x4150e51980114468aa8309bb72f027d8bff41353',
                                interval: 24 * 60,
                                amount: '1000000000000000000'
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

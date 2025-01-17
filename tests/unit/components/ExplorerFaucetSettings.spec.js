import flushPromises from 'flush-promises';

import ExplorerFaucetSettings from '@/components/ExplorerFaucetSettings.vue';

describe('ExplorerFaucetSettings.vue', () => {
    const stubs = ['Create-Explorer-Faucet-Modal', 'Explorer-Faucet-Settings-Danger-Zone', 'Hash-Link'];

    it('Should display faucet intro', async () => {
        vi.spyOn(server, 'getExplorer').mockResolvedValueOnce({ data: { faucet: null }});

        const wrapper = mount(ExplorerFaucetSettings, {
            global: {
                stubs
            },
            props: {
                explorerId: 1
            }
        });
        await flushPromises();

        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should display active faucet UI', async () => {
        vi.spyOn(server, 'getExplorer').mockResolvedValueOnce({ data: {
            token: 'ETL',
            domain: 'ethernal.com',
            domains: [],
            faucet: {
                id: 1,
                address: '0x4150e51980114468aa8309bb72f027d8bff41353',
                amount: '100000000000000000',
                interval: 24 * 60,
                active: true
            }
        }});
        vi.spyOn(server, 'getFaucetBalance').mockResolvedValueOnce({ data: { balance: '90000000000000000' }});

        const wrapper = mount(ExplorerFaucetSettings, {
            global: {
                stubs
            },
            props: {
                explorerId: 1
            }
        });
        await flushPromises();

        expect(wrapper.html()).toMatchSnapshot();
    });

    it('SHould display inactive faucet UI', async () => {
        vi.spyOn(server, 'getExplorer').mockResolvedValueOnce({ data: {
            token: 'ETL',
            domain: 'ethernal.com',
            domains: [],
            faucet: {
                id: 1,
                address: '0x4150e51980114468aa8309bb72f027d8bff41353',
                amount: '100000000000000000',
                interval: 24 * 60,
                active: false
            }
        }});
        vi.spyOn(server, 'getFaucetBalance').mockResolvedValueOnce({ data: { balance: '90000000000000000' }});

        const wrapper = mount(ExplorerFaucetSettings, {
            global: {
                stubs
            },
            props: {
                explorerId: 1
            }
        });
        await flushPromises();

        expect(wrapper.html()).toMatchSnapshot();
    });
});

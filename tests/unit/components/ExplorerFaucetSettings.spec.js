import flushPromises from 'flush-promises';
import MockHelper from '../MockHelper';

import ExplorerFaucetSettings from '@/components/ExplorerFaucetSettings.vue';

beforeEach(() => jest.clearAllMocks());

describe('ExplorerFaucetSettings.vue', () => {
    let helper;
    const stubs = ['Create-Explorer-Faucet-Modal', 'Explorer-Faucet-Settings-Danger-Zone', 'Hash-Link'];

    beforeEach(() => {
        helper = new MockHelper();
    });

    it('Should display faucet intro', async () => {
        jest.spyOn(helper.mocks.server, 'getExplorer').mockResolvedValueOnce({ data: { faucet: null }});

        const wrapper = helper.mountFn(ExplorerFaucetSettings, {
            stubs,
            propsData: {
                explorerId: 1
            }
        });
        await flushPromises();

        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should display active faucet UI', async () => {
        jest.spyOn(helper.mocks.server, 'getExplorer').mockResolvedValueOnce({ data: {
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
        jest.spyOn(helper.mocks.server, 'getFaucetBalance').mockResolvedValueOnce({ data: { balance: '90000000000000000' }});

        const wrapper = helper.mountFn(ExplorerFaucetSettings, {
            stubs,
            propsData: {
                explorerId: 1
            }
        });
        await flushPromises();

        expect(wrapper.html()).toMatchSnapshot();
    });

    it('SHould display inactive faucet UI', async () => {
        jest.spyOn(helper.mocks.server, 'getExplorer').mockResolvedValueOnce({ data: {
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
        jest.spyOn(helper.mocks.server, 'getFaucetBalance').mockResolvedValueOnce({ data: { balance: '90000000000000000' }});

        const wrapper = helper.mountFn(ExplorerFaucetSettings, {
            stubs,
            propsData: {
                explorerId: 1
            }
        });
        await flushPromises();

        expect(wrapper.html()).toMatchSnapshot();
    });
});

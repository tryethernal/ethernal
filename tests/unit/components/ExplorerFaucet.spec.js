import flushPromises from 'flush-promises';
import MockHelper from '../MockHelper';

import ExplorerFaucet from '@/components/ExplorerFaucet.vue';

beforeEach(() => jest.clearAllMocks());

describe('ExplorerFaucet.vue', () => {
    let helper;
    const stubs = ['Hash-Link', 'Explorer-Faucet-Analytics', 'Explorer-Faucet-Transaction-History']

    beforeEach(() => {
        helper = new MockHelper();
    });

    it('Should display faucet intro', async () => {
        const wrapper = helper.mountFn(ExplorerFaucet, {
            stubs,
            getters: {
                publicExplorer: jest.fn(() => ({ faucet: null }))
            }
        });
        await flushPromises();

        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should display an active faucet', async () => {
        jest.spyOn(helper.mocks.server, 'getFaucetBalance').mockResolvedValueOnce({ data: { balance: '2000000000000000000' }});
        jest.spyOn(Storage.prototype, 'getItem').mockReturnValueOnce(JSON.stringify([
            { address: '0x4150e51980114468aa8309bb72f027d8bff41353', cooldown: 120 },
            { address: '0x4150e51980114468aa8309bb72f027d8bff41353', cooldown: 120 },
            { address: '0x4150e51980114468aa8309bb72f027d8bff41353', cooldown: 120 },
            { address: '0x4150e51980114468aa8309bb72f027d8bff41353', cooldown: 120 },
            { address: '0x4150e51980114468aa8309bb72f027d8bff41353', cooldown: 120 },
            { address: '0x4150e51980114468aa8309bb72f027d8bff41353', cooldown: 120 }
        ]));
        const wrapper = helper.mountFn(ExplorerFaucet, {
            stubs,
            getters: {
                publicExplorer: jest.fn(() => ({
                    token: 'ETL',
                    faucet: {
                        id: 1,
                        address: '0x4150e51980114468aa8309bb72f027d8bff41353',
                        interval: 24 * 60,
                        amount: '1000000000000000000'
                    }
                }))
            }
        });
        await flushPromises();

        expect(wrapper.html()).toMatchSnapshot();
    });
});

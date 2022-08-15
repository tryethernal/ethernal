import flushPromises from 'flush-promises';
import '../mocks/router';
import MockHelper from '../MockHelper';

import Overview from '@/components/Overview.vue';

describe('Overview.vue', () => {
    let helper;

    beforeEach(async () => {
        helper = new MockHelper();
    });

    it('Should load the overview page', async () => {
        jest.spyOn(helper.mocks.server, 'getGlobalStats').mockResolvedValue({ data: {
            txCount24h: 10,
            txCountTotal: 100,
            activeWalletCount: 5
        }});
        jest.spyOn(helper.mocks.server, 'getTransactions').mockResolvedValue({ data: { items: [] }});
        jest.spyOn(helper.mocks.server, 'getTransactionVolume').mockResolvedValue({ data: [] });
        jest.spyOn(helper.mocks.server, 'getWalletVolume').mockResolvedValue({ data: [] });

        const wrapper = helper.mountFn(Overview, {
            stubs: ['Transactions-List', 'Block-List', 'Line-Chart', 'Stat-Number'],
            getters: {
                isPublicExplorer: jest.fn().mockReturnValue(true)
            }
        });
        await flushPromises();
        expect(wrapper.html()).toMatchSnapshot();
    });
});

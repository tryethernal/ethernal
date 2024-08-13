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
        jest.spyOn(helper.mocks.server, 'getActiveWalletCount').mockResolvedValue({ data: { count: 5, }});
        jest.spyOn(helper.mocks.server, 'getTxCountTotal').mockResolvedValue({ data: { count: 100, }});
        jest.spyOn(helper.mocks.server, 'getTxCount24h').mockResolvedValue({ data: { count: 10, }});
        jest.spyOn(helper.mocks.server, 'getTransactions').mockResolvedValue({ data: { items: [{ date: 1, count: 1 }]}});
        jest.spyOn(helper.mocks.server, 'getTransactionVolume').mockResolvedValue({ data: [{ date: 1, count: 1 }]});
        jest.spyOn(helper.mocks.server, 'getUniqueWalletCount').mockResolvedValue({ data: [{ date: 1, count: 1 }] });

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

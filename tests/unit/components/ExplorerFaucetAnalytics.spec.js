import flushPromises from 'flush-promises';
import MockHelper from '../MockHelper';

import ExplorerFaucetAnalytics from '@/components/ExplorerFaucetAnalytics.vue';

beforeEach(() => jest.clearAllMocks());

describe('ExplorerFaucetAnalytics.vue', () => {
    let helper;
    const stubs = ['Line-Chart'];

    beforeEach(() => {
        helper = new MockHelper();
    });

    it('Should display faucet analytics', async () => {
        jest.spyOn(helper.mocks.server, 'getFaucetRequestVolume').mockResolvedValue({ data: [{ date: 1, count: 1 }, { date: 2, count: 1 }]});
        jest.spyOn(helper.mocks.server, 'getFaucetTokenVolume').mockResolvedValue({ data: [{ date: 1, amount: '10000000000000000000' }, { date: 1, amount: '20000000000000000000' }]});

        const wrapper = helper.mountFn(ExplorerFaucetAnalytics, {
            stubs,
            getters: {
                publicExplorer: jest.fn(() => ({ token: 'ETL' }))
            }
        });
        await flushPromises();

        expect(wrapper.html()).toMatchSnapshot();
    });
});

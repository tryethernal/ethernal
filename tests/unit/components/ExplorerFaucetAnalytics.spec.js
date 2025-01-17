import flushPromises from 'flush-promises';

import ExplorerFaucetAnalytics from '@/components/ExplorerFaucetAnalytics.vue';

describe('ExplorerFaucetAnalytics.vue', () => {
    const stubs = ['Line-Chart'];

    it('Should display faucet analytics', async () => {
        vi.spyOn(server, 'getFaucetRequestVolume').mockResolvedValue({ data: [{ date: 1, count: 1 }, { date: 2, count: 1 }]});
        vi.spyOn(server, 'getFaucetTokenVolume').mockResolvedValue({ data: [{ date: 1, amount: '10000000000000000000' }, { date: 1, amount: '20000000000000000000' }]});

        const wrapper = mount(ExplorerFaucetAnalytics, {
            global: {
                stubs,
                plugins: [createTestingPinia({
                    initialState: {
                        explorer: {
                            token: 'ETL'
                        }
                    }
                })]
            }
        });
        await flushPromises();

        expect(wrapper.html()).toMatchSnapshot();
    });
});

import Overview from '@/components/Overview.vue';

describe('Overview.vue', () => {
    it('Should load the overview page', async () => {
        vi.spyOn(server, 'getActiveWalletCount').mockResolvedValue({ data: { count: 5, }});
        vi.spyOn(server, 'getTxCountTotal').mockResolvedValue({ data: { count: 100, }});
        vi.spyOn(server, 'getTxCount24h').mockResolvedValue({ data: { count: 10, }});
        vi.spyOn(server, 'getTransactions').mockResolvedValue({ data: { items: [{ date: 1, count: 1 }]}});
        vi.spyOn(server, 'getTransactionVolume').mockResolvedValue({ data: [{ date: 1, count: 1 }]});
        vi.spyOn(server, 'getUniqueWalletCount').mockResolvedValue({ data: [{ date: 1, count: 1 }] });

        const wrapper = mount(Overview, {
            global: {
                stubs: ['TransactionsList', 'BlockList', 'OverviewCharts', 'SearchBar', 'OverviewStats'],
                plugins: [createTestingPinia()],
            }
        });
        await flushPromises();
        expect(wrapper.html()).toMatchSnapshot();
    });
});

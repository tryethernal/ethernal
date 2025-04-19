import flushPromises from 'flush-promises';

import Transactions from '@/components/Transactions.vue';

describe('Transactions.vue', () => {
    it('Should display the list', async () => {
        vi.spyOn(server, 'getTxCount24h').mockResolvedValue(100);
        vi.spyOn(server, 'getLast24hTransactionFee').mockResolvedValue(100);
        vi.spyOn(server, 'getLast24hAverageTransactionFee').mockResolvedValue(100);

        const wrapper = mount(Transactions, {
            props: { address: '0x123' },
            global: {
                stubs: ['Transactions-List', 'Stat-Number']
            }
        });
        await flushPromises();

        expect(wrapper.html()).toMatchSnapshot();
    });
});

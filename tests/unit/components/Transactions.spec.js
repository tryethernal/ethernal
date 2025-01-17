import flushPromises from 'flush-promises';

import Transactions from '@/components/Transactions.vue';

describe('Transactions.vue', () => {
    it('Should display the list', async () => {
        const wrapper = mount(Transactions, {
            props: { address: '0x123' },
            global: {
                stubs: ['Transactions-List']
            }
        });
        await flushPromises();

        expect(wrapper.html()).toMatchSnapshot();
    });
});

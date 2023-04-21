import flushPromises from 'flush-promises';
import MockHelper from '../MockHelper';

import Transactions from '@/components/Transactions.vue';

describe('Transactions.vue', () => {
    let helper;

    beforeEach(async () => {
        helper = new MockHelper();
    });

    it('Should display the list', async () => {
        const wrapper = helper.mountFn(Transactions, {
            props: { address: '0x123' },
            stubs: ['Transactions-List']
        });
        await flushPromises();

        expect(wrapper.html()).toMatchSnapshot();
    });
});

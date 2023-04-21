import MockHelper from '../MockHelper';
import flushPromises from 'flush-promises'

import AddressTransactionsList from '@/components/AddressTransactionsList.vue';

let helper;

describe('AddressTransactionsList.vue', () => {
    beforeEach(async () => {
        helper = new MockHelper();
    });

    it('Should display the list', async () => {
        const wrapper = helper.mountFn(AddressTransactionsList, {
            propsData: {
                address: '0x123'
            },
            stubs: ['Hash-Link', 'Transactions-List']
        });

        await flushPromises();
        expect(wrapper.html()).toMatchSnapshot();
    });
});

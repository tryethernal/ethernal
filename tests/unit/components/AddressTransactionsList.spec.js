import flushPromises from 'flush-promises'

import AddressTransactionsList from '@/components/AddressTransactionsList.vue';

describe('AddressTransactionsList.vue', () => {
    it('Should display the list', async () => {
        const wrapper = mount(AddressTransactionsList, {
            props: {
                address: '0x123'
            },
            global: {
                stubs: ['Hash-Link', 'Transactions-List']
            }
        });

        await flushPromises();
        expect(wrapper.html()).toMatchSnapshot();
    });
});

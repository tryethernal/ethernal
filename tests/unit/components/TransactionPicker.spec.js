import flushPromises from 'flush-promises';
import MockHelper from '../MockHelper';

import TransactionPicker from '@/components/TransactionPicker.vue';
import Transaction from '../fixtures/TransactionProp.json';
import ABI from '../fixtures/ABIProp.json';

describe('TransactionPicker.vue', () => {
    let helper;

    beforeEach(async () => {
        helper = new MockHelper();
        jest.spyOn(helper.mocks.server, 'getContract')
            .mockResolvedValue({ data: { address: Transaction.to, abi: ABI }});
    });

    it('Should display the picker', async (done) => {
        const wrapper = helper.mountFn(TransactionPicker, {
            propsData: {
                transactions: [Transaction]
            }
        });
        await flushPromises();
        expect(wrapper.html()).toMatchSnapshot();
        done();
    });

    it('Should display a message if no transactions', async (done) => {
        const wrapper = helper.mountFn(TransactionPicker, {
            propsData: {
                transactions: []
            }
        });
        await flushPromises();
        expect(wrapper.html()).toMatchSnapshot();
        done();
    });
});

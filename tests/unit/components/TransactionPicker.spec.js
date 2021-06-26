import MockHelper from '../MockHelper';

import TransactionPicker from '@/components/TransactionPicker.vue';
import Transaction from '../fixtures/TransactionProp.json';
import ABI from '../fixtures/ABIProp.json';

describe('TransactionPicker.vue', () => {
    let helper;

    beforeEach(async () => {
        helper = new MockHelper();
        await helper.db.collection('contracts').doc(Transaction.to).set({ abi: ABI });
    });

    it('Should display the picker', async (done) => {
        const wrapper = helper.mountFn(TransactionPicker, {
            propsData: {
                transactions: [Transaction, Transaction]
            }
        });
        await wrapper.vm.$nextTick();
        expect(wrapper.html()).toMatchSnapshot();
        done();
    });

    it('Should display a message if no transactions', async (done) => {
        const wrapper = helper.mountFn(TransactionPicker, {
            propsData: {
                transactions: []
            }
        });
        await wrapper.vm.$nextTick();
        expect(wrapper.html()).toMatchSnapshot();
        done();
    });

    afterEach(async () => {
        await helper.clearFirebase();
    });
});

import MockHelper from '../MockHelper';

import TransactionFunctionCall from '@/components/TransactionFunctionCall.vue';
import Transaction from '../fixtures/TransactionProp.json';
import ABIProp from '../fixtures/ABIProp.json';

describe('TransactionFunctionCall.vue', () => {
    let helper;

    beforeEach(() => {
        helper = new MockHelper();
    });

    it('Should display transaction call', async (done) => {
        const wrapper = helper.mountFn(TransactionFunctionCall, {
            propsData: {
                data: Transaction.data,
                value: Transaction.value,
                abi: ABIProp,
                to: Transaction.to
            }
        });
        await wrapper.vm.$nextTick();
        expect(wrapper.html()).toMatchSnapshot();
        done();
    });

    it('Should display warning if no ABI', async (done) => {
        const wrapper = helper.mountFn(TransactionFunctionCall, {
            propsData: {
                data: Transaction.data,
                value: Transaction.value,
                to: Transaction.to
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

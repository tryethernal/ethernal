import MockHelper from '../MockHelper';

import TransactionData from '@/components/TransactionData.vue';
import TransactionProp from '../fixtures/TransactionProp.json';
import ABIProp from '../fixtures/ABIProp.json';

describe('TransactionData.vue', () => {
    let helper;

    beforeEach(() => {
        helper = new MockHelper();
    });

    it('Should display transaction data', async (done) => {
        const wrapper = helper.mountFn(TransactionData, {
            propsData: {
                transaction: TransactionProp,
                abi: ABIProp
            }
        });
        await wrapper.vm.$nextTick();
        expect(wrapper.html()).toMatchSnapshot();
        done();
    });

    it('Should display instructions if there is no ABI', async (done) => {
        const wrapper = helper.mountFn(TransactionData, {
            propsData: {
                transaction: TransactionProp
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

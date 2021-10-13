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
        await helper.mocks.admin.collection('contracts').doc(TransactionProp.to).set({ address: TransactionProp.to, abi: ABIProp });
        const wrapper = helper.mountFn(TransactionData, {
            propsData: {
                transaction: TransactionProp,
                abi: ABIProp
            }
        });
        setTimeout(() => {
            expect(wrapper.html()).toMatchSnapshot();
            done();
        }, 1000);
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

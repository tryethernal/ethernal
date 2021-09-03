import MockHelper from '../MockHelper';

import TransactionEvent from '@/components/TransactionEvent.vue';
import TransactionProp from '../fixtures/TransactionProp.json';
import ABIProp from '../fixtures/ABIProp.json';
import LogProp from '../fixtures/LogProp.json';

describe('TransactionEvent.vue', () => {
    let helper;

    beforeEach(() => {
        helper = new MockHelper();
    });

    it('Should display transaction event', async (done) => {
        await helper.mocks.db.collection('contracts').doc(TransactionProp.to).set({ abi: ABIProp });
        const wrapper = helper.mountFn(TransactionEvent, {
            propsData: {
                log: LogProp
            }
        });
        setTimeout(() => {
            expect(wrapper.html()).toMatchSnapshot();
            done();
        }, 1000);
    });

    it('Should display warning if no ABI', async (done) => {
        const wrapper = helper.mountFn(TransactionEvent, {
            propsData: {
                log: LogProp
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

import MockHelper from '../MockHelper';

import TransactionFunctionCall from '@/components/TransactionFunctionCall.vue';
import Transaction from '../fixtures/TransactionProp.json';
import ABIProp from '../fixtures/ABIProp.json';

describe('TransactionFunctionCall.vue', () => {
    let helper;

    beforeEach(() => {
        helper = new MockHelper();
    });

    it.only('Should handle arrays as parameters', async (done) => {
        const wrapper = helper.mountFn(TransactionFunctionCall, {
            propsData: {
                data: '0xe10497e00000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000003',
                value: '0',
                abi: [{
                    "inputs": [
                        {
                            "internalType": "uint256[]",
                            "name": "values",
                            "type": "uint256[]"
                        }
                    ],
                    "name": "reproWriteBug",
                    "outputs": [],
                    "stateMutability": "nonpayable",
                    "type": "function"
                }],
                to: '0x1234'
            }
        });

        await wrapper.vm.$nextTick();
        expect(wrapper.html()).toMatchSnapshot();
        done();
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

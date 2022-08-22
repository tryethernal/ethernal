import flushPromises from 'flush-promises';
import MockHelper from '../MockHelper';

import TransactionFunctionCall from '@/components/TransactionFunctionCall.vue';
import Transaction from '../fixtures/TransactionProp.json';
import ABIProp from '../fixtures/ABIProp.json';

describe('TransactionFunctionCall.vue', () => {
    let helper;

    beforeEach(() => {
        helper = new MockHelper();
    });

    it('Should load erc20 abi if function is detected', async () => {
        const wrapper = helper.mountFn(TransactionFunctionCall, {
            propsData: {
                data: Transaction.data,
                value: Transaction.value,
                to: Transaction.to
            }
        });
        await flushPromises();
        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should handle arrays as parameters', async () => {
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

        await flushPromises();
        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should display transaction call', async () => {
        const wrapper = helper.mountFn(TransactionFunctionCall, {
            propsData: {
                data: Transaction.data,
                value: Transaction.value,
                abi: ABIProp,
                to: Transaction.to
            }
        });
        await flushPromises();
        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should display warning if no ABI', async () => {
        const wrapper = helper.mountFn(TransactionFunctionCall, {
            propsData: {
                data: '0xb9059cbb23456789',
                value: Transaction.value,
                to: Transaction.to
            }
        });
        await flushPromises();
        expect(wrapper.html()).toMatchSnapshot();
    });
});

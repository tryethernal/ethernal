import flushPromises from 'flush-promises';
import MockHelper from '../MockHelper';

import TransactionData from '@/components/TransactionData.vue';
import TransactionProp from '../fixtures/TransactionProp.json';
import ABIProp from '../fixtures/ABIProp.json';

describe('TransactionData.vue', () => {
    let helper;

    beforeEach(() => {
        helper = new MockHelper();
    });

    it('Should display transaction data', async () => {
        jest.spyOn(helper.mocks.server, 'getTransactionLogs')
            .mockResolvedValue({
                data: { count: 21, logs: [{}] }
            });
        jest.spyOn(helper.mocks.server, 'getContract')
            .mockResolvedValue({
                data: { address: TransactionProp.to, abi: ABIProp }
            });

        const wrapper = helper.mountFn(TransactionData, {
            propsData: {
                transaction: TransactionProp,
                abi: ABIProp
            },
            stubs: ['Transaction-Function-Call', 'Transaction-Event']
        });
        await flushPromises();

        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should display instructions if there is no ABI', async () => {
        jest.spyOn(helper.mocks.server, 'getTransactionLogs')
            .mockResolvedValue({
                data: { count: 1, logs: [{}] }
            });
        const wrapper = helper.mountFn(TransactionData, {
            propsData: {
                transaction: TransactionProp
            },
            stubs: ['Transaction-Function-Call', 'Transaction-Event']
        });
        await flushPromises();

        expect(wrapper.html()).toMatchSnapshot();
    });
});

import flushPromises from 'flush-promises';

import TransactionData from '@/components/TransactionData.vue';
import TransactionProp from '../fixtures/TransactionProp.json';
import ABIProp from '../fixtures/ABIProp.json';

describe('TransactionData.vue', () => {
    it('Should display transaction data', async () => {
        vi.spyOn(server, 'getTransactionLogs')
            .mockResolvedValue({
                data: { count: 21, logs: [{}] }
            });
        vi.spyOn(server, 'getContract')
            .mockResolvedValue({
                data: { address: TransactionProp.to, abi: ABIProp }
            });

        const wrapper = mount(TransactionData, {
            props: {
                transaction: TransactionProp,
                abi: ABIProp
            },
            global: {
                stubs: ['Transaction-Function-Call', 'Transaction-Event']
            }
        });
        await flushPromises();

        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should display instructions if there is no ABI', async () => {
        vi.spyOn(server, 'getTransactionLogs')
            .mockResolvedValue({
                data: { count: 1, logs: [{}] }
            });
        const wrapper = mount(TransactionData, {
            props: {
                transaction: TransactionProp
            },
            global: {
                stubs: ['Transaction-Function-Call', 'Transaction-Event']
            }
        });
        await flushPromises();

        expect(wrapper.html()).toMatchSnapshot();
    });
});

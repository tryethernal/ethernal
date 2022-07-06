import flushPromises from 'flush-promises';
import MockHelper from '../MockHelper';

import Transactions from '@/components/Transactions.vue';

describe('Transactions.vue', () => {
    let helper;

    beforeEach(async () => {
        helper = new MockHelper();
    });

    it('Should display the list', async (done) => {
        const transaction1 = {
            hash: '0x060034486a819816df57d01eefccbe161d7019f9f3c235e18af07468fb194ef0',
            timestamp: '1621548462',
            from: '0x0',
            to: 'Ox1',
            blockNumber: 1,
            value: '0',
            data: '0xa9059cbb000000000000000000000000c00e94cb662c3520282e6f5717214004a7f268880000000000000000000000000000000000000000000000000000000000000001'
        };

        const transaction2 = {
            hash: '0x1234',
            timestamp: '1621548462',
            from: '0x0',
            to: 'Ox1',
            blockNumber: 1,
            value: '0'
        };

        jest.spyOn(helper.mocks.server, 'getTransactions')
            .mockResolvedValue({
                data: {
                    items: [transaction1, transaction2],
                    total: 2
                }
            });

        const wrapper = helper.mountFn(Transactions);
        await new Promise(process.nextTick);

        expect(wrapper.html()).toMatchSnapshot();
        expect(wrapper.vm.transactions).toEqual([transaction1, transaction2]);
        expect(wrapper.vm.transactionCount).toEqual(2);
        done();
    });
});

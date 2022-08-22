import MockHelper from '../MockHelper';
import flushPromises from 'flush-promises'

import AddressTransactionsList from '@/components/AddressTransactionsList.vue';

let helper;

describe('AddressTransactionsList.vue', () => {
    let transactions = [];

    beforeEach(async () => {
        helper = new MockHelper();
        jest.spyOn(Date, 'now').mockImplementation(() => new Date('2022-08-07T12:33:37.000Z'));
        for (let i = 1; i <= 5; i++) {
            const transaction = {
                id: i,
                hash: `0x${i}`,
                timestamp: '2022-05-06T17:11:26.000Z',
                from: '0x1',
                to: '0x0',
                blockNumber: i,
                value: '0',
                gasPrice: '0',
                gas: '0',
                receipt: {
                    status: true
                },
                data: '0xa9059cbb000000000000000000000000c00e94cb662c3520282e6f5717214004a7f268880000000000000000000000000000000000000000000000000000000000000001'
            };
            transactions.push(transaction);
        }
    });

    it('Should display the list', async () => {
        jest.spyOn(helper.mocks.server, 'getAddressTransactions')
            .mockResolvedValue({ data: { items: transactions, transactionCount: 5 }});

        const wrapper = helper.mountFn(AddressTransactionsList, {
            propsData: {
                address: '0x123'
            },
            stubs: ['Hash-Link']
        });

        await new Promise(process.nextTick);
        expect(wrapper.html()).toMatchSnapshot();
    });
});

import flushPromises from 'flush-promises';
import MockHelper from '../MockHelper';

import ExplorerFaucetTransactionHistory from '@/components/ExplorerFaucetTransactionHistory.vue';

beforeEach(() => jest.clearAllMocks());

describe('ExplorerFaucetTransactionHistory.vue', () => {
    let helper;
    const stubs = ['Hash-Link'];

    beforeEach(() => {
        helper = new MockHelper();
        jest.spyOn(Date, 'now').mockImplementation(() => new Date('2022-08-07T12:33:37.000Z'));
    });

    it('Should display transaction history', async () => {
        jest.spyOn(helper.mocks.server, 'getFaucetTransactionHistory').mockResolvedValue({ data: {
            transactions: [
                { transactionHash: '0x123', address: '0xabc', amount: '10000000000000000' }
            ],
            count: 1
        }});

        const wrapper = helper.mountFn(ExplorerFaucetTransactionHistory, {
            stubs,
            getters: {
                publicExplorer: jest.fn(() => ({ faucet: { id: 1 }, token: 'ETL' }))
            }
        });
        await flushPromises();

        expect(wrapper.html()).toMatchSnapshot();
    });
});

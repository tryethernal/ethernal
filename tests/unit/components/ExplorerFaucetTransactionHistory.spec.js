import flushPromises from 'flush-promises';

import ExplorerFaucetTransactionHistory from '@/components/ExplorerFaucetTransactionHistory.vue';

describe('ExplorerFaucetTransactionHistory.vue', () => {
    const stubs = ['Hash-Link'];

    it('Should display transaction history', async () => {
        vi.spyOn(server, 'getFaucetTransactionHistory').mockResolvedValue({ data: {
            transactions: [
                { transactionHash: '0x123', address: '0xabc', amount: '10000000000000000' }
            ],
            count: 1
        }});

        const wrapper = mount(ExplorerFaucetTransactionHistory, {
            global: {
                stubs,
                plugins: [createTestingPinia({
                    initialState: {
                        token: 'ETL',
                        faucet: {
                            id: 1,
                            active: true
                        }
                    }
                })]
            }
        });
        await flushPromises();

        expect(wrapper.html()).toMatchSnapshot();
    });
});

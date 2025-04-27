import flushPromises from 'flush-promises'

import AddressAnalytics from '@/components/AddressAnalytics.vue';

const stubs = ['DateRangeSelector', 'LineChart', 'MultiLineChart'];

describe('AddressAnalytics.vue', () => {
    it('Should load address analytics', async () => {
        vi.spyOn(server, 'getAddressTransactionHistory').mockResolvedValueOnce({
            data: [{ day: '2021-01-01', count: 1 }]
        });
        vi.spyOn(server, 'getAddressSpentTransactionFeeHistory').mockResolvedValueOnce({
            data: [{ day: '2021-01-01', transaction_fees: 1n }]
        });
        vi.spyOn(server, 'getAddressTokenTransferHistory').mockResolvedValueOnce({
            data: [{ day: '2021-01-01', token_transfers: 1 }]
        });
        const wrapper = mount(AddressAnalytics, {
            props: {
                address: '0x1234567890123456789012345678901234567890'
            },
            global: {
                plugins: [createTestingPinia({ initialState: {
                    currentWorkspace: {
                        id: 1,
                        chain: {
                            token: 'ETH'
                        }
                    }
                } })],
                stubs
            }
        });
        wrapper.vm.updateCharts({ from: '2021-01-01', to: '2021-01-01' });
        await flushPromises();

        expect(wrapper.html()).toMatchSnapshot();
    });
});

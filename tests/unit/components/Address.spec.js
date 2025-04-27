import flushPromises from 'flush-promises';
import Address from '@/components/Address.vue';

const stubs = [
    'Base-Chip-Group',
    'Address-Header',
    'Address-Transactions-List',
    'Address-Token-Transfers',
    'Address-Trace-Steps',
    'Contract-Details',
    'Contract-Logs',
    'Address-Assets',
    'Address-Analytics'
];

describe('Address.vue', () => {
    beforeAll(() => {
        vi.spyOn(server, 'getNativeTokenBalance')
            .mockResolvedValue({ data: { balance: '10000' }});
        vi.spyOn(server, 'getAddressTransactions')
            .mockResolvedValue({ data: { items: [] }});
        vi.spyOn(server, 'getAddressStats')
            .mockResolvedValue({ data: {
                sentTransactionCount: 1,
                receivedTransactionCount: 2,
                sentErc20TokenTransferCount: 3,
                receivedErc20TokenTransferCount: 4
            }});
    });

    it('Should display address base page', async () => {
        vi.spyOn(server, 'getContract')
            .mockResolvedValueOnce({ data: null });
        const wrapper = mount(Address, {
            props: {
                hash: '0x123'
            },
            global: {
                stubs,
                mocks: {
                    $route: {
                        query: {
                            tab: 'transactions'
                        }
                    }
                }
            }
        });

        await flushPromises();
        expect(wrapper.html()).toMatchSnapshot();
    });
});

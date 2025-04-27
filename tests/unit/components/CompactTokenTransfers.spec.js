import CompactTokenTransfers from '@/components/CompactTokenTransfers.vue';
import { VPagination } from 'vuetify/components';

const stubs = ['HashLink'];

describe('CompactTokenTransfers.vue', () => {
    it('Should show loading state', async () => {
        const wrapper = mount(CompactTokenTransfers, {
            props: {
                loading: true,
                transfers: [],
                count: 0,
                itemsPerPage: 5
            },
            global: {
                stubs
            }
        });

        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should show empty state when no transfers', async () => {
        const wrapper = mount(CompactTokenTransfers, {
            props: {
                loading: false,
                transfers: [],
                count: 0,
                itemsPerPage: 5
            },
            global: {
                stubs
            }
        });

        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should show transfers list with pagination', async () => {
        const transfers = [
            {
                id: 1,
                src: '0x123',
                dst: '0x456',
                amount: '1000000000000000000',
                token: '0x789',
                contract: {
                    tokenName: 'Test Token',
                    tokenSymbol: 'TEST',
                    tokenDecimals: 18,
                    patterns: ['erc20']
                }
            },
            {
                id: 2,
                src: '0x789',
                dst: '0xabc',
                amount: '2000000000000000000',
                token: '0x789',
                contract: {
                    tokenName: 'Test Token',
                    tokenSymbol: 'TEST',
                    tokenDecimals: 18,
                    patterns: ['erc20']
                }
            }
        ];

        const wrapper = mount(CompactTokenTransfers, {
            props: {
                loading: false,
                transfers,
                count: 10,
                itemsPerPage: 5
            },
            global: {
                stubs,
                mocks: {
                    $fromWei: vi.fn().mockReturnValue('1.0')
                }
            }
        });
        await flushPromises();

        expect(wrapper.html()).toMatchSnapshot();

        // Test pagination event
        await wrapper.findComponent(VPagination).vm.$emit('update:model-value', 2);
        expect(wrapper.emitted().pagination[0]).toEqual([{
            page: 2,
            itemsPerPage: 5,
            sortBy: undefined
        }]);
    });
});

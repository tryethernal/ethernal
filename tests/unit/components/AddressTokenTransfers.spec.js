import flushPromises from 'flush-promises'

import AddressTokenTransfers from '@/components/AddressTokenTransfers.vue';

const stubs = ['TokenTransfers', 'BaseChipGroup'];

describe('AddressTokenTransfers.vue', () => {
    it('Should load address token transfers', async () => {
        vi.spyOn(server, 'getAddressTokenTransfers').mockResolvedValueOnce({
            data: {
                items: [
                    {
                        tokenType: 'erc20',
                        transactionHash: '0x1234567890123456789012345678901234567890',
                        methodDetails: 'Transfer',
                        blockNumber: 1,
                        timestamp: '2021-01-01',
                        src: '0x1234567890123456789012345678901234567890',
                        dst: '0x1234567890123456789012345678901234567890',
                    }
                ],
                total: 1
            }
        });

        const wrapper = mount(AddressTokenTransfers, {
            props: {
                address: '0x1234567890123456789012345678901234567890',
                erc20Count: 1,
                erc721Count: 1,
                erc1155Count: 1
            },
            global: {
                stubs
            }
        });
        await flushPromises();

        expect(wrapper.html()).toMatchSnapshot();
    });
});

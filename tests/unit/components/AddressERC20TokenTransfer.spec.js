import flushPromises from 'flush-promises'

import AddressERC20TokenTransfer from '@/components/AddressERC20TokenTransfer.vue';

const stubs = ['TokenTransfers'];

describe('AddressERC20TokenTransfer.vue', () => {
    it('Should load address erc20 token transfers', async () => {
        vi.spyOn(server, 'getTokenTransfers').mockResolvedValueOnce({
            data: {
                items: [{
                    transactionHash: '0x1234567890123456789012345678901234567890',
                    methodDetails: 'transfer',
                    blockNumber: 1,
                    timestamp: '2021-01-01',
                    src: '0x1234567890123456789012345678901234567890',
                    dst: '0x1234567890123456789012345678901234567890',
                    amount: '1000000000000000000'
                }]
            }
        });

        const wrapper = mount(AddressERC20TokenTransfer, {
            props: {
                address: '0x1234567890123456789012345678901234567890'
            },
            global: {
                stubs
            }
        });
        await flushPromises();

        expect(wrapper.html()).toMatchSnapshot();
    });
});

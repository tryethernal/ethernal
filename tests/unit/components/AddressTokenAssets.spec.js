import flushPromises from 'flush-promises'

import AddressTokenAssets from '@/components/AddressTokenAssets.vue';

const stubs = ['HashLink'];

describe('AddressTokenAssets.vue', () => {
    it('Should load address token assets', async () => {
        vi.spyOn(server, 'getTokenBalances').mockResolvedValueOnce({
            data: [{
                tokenContract: {
                    address: '0x1234567890123456789012345678901234567890',
                    tokenSymbol: 'ETH',
                    tokenDecimals: 18,
                    tokenName: 'Ether'
                },
                token: '0x1234567890123456789012345678901234567890',
                currentBalance: '1000000000000000000'
            }]
        });

        const wrapper = mount(AddressTokenAssets, {
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

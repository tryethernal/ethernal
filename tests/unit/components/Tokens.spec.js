import Tokens from '@/components/Tokens.vue';

describe('Tokens.vue', () => {
    it('Should display token contracts', async () => {
        vi.spyOn(server, 'getContracts')
            .mockResolvedValue({
                data: {
                    items: [
                        { timestamp: '1636557049', address: '0x123', contractName: 'Ethernal Token', tokenName: 'Ethernal', tokenSymbol: 'ETL', tokenDecimals: 18, patterns: ['erc20'] },
                        { timestamp: '1636557049', address: '0x124', contractName: 'USD Coin', tokenName: 'USDC', tokenSymbol: 'USDC', tokenDecimals: 6, patterns: ['erc20', 'proxy'] }
                    ],
                    total: 2
                }
            });

        const wrapper = mount(Tokens, {
            global: {
                stubs: ['Hash-Link']
            }
        });
        await new Promise(process.nextTick);

        expect(wrapper.html()).toMatchSnapshot();
    });
});

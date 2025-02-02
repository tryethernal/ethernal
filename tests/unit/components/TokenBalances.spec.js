import TokenBalances from '@/components/TokenBalances.vue';

describe('TokenBalances.vue', () => {
    it('Should display token balances', async () => {
        vi.spyOn(server, 'getTokenBalances')
            .mockResolvedValue({
                data: [
                    { token: '0x123', address: '0xabcd', currentBalance: '99999989989989999000000000000', tokenContract: { name: 'EthernalToken', tokenName: 'Ethernal', tokenSymbol: 'ETL', tokenDecimals: 18 }},
                    { token: '0x456', address: '0xabcd', currentBalance: '999999899899', tokenContract: { name: 'USDCContract', tokenName: 'USDC', tokenSymbol: 'USDC', tokenDecimals: 6 }}
                ]
            });

        const wrapper = mount(TokenBalances, {
            global: {
                stubs: ['Hash-Link']
            }
        });
        await new Promise(process.nextTick);

        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should hide the topbar if in dense mode', async () => {
        vi.spyOn(server, 'getTokenBalances')
            .mockResolvedValue({
                data: [
                    { token: '0x123', address: '0xabcd', currentBalance: '1', tokenContract: { name: 'EthernalToken', tokenName: 'Ethernal', tokenSymbol: 'ETL' }},
                    { token: '0x456', address: '0xabcd', currentBalance: '2', tokenContract: { name: 'USDCContract', tokenName: 'USDC', tokenSymbol: 'USDC' }}
                ]
            });

        const wrapper = mount(TokenBalances, {
            props: {
                patterns: ['erc721'],
                dense: true
            },
            global: {
                stubs: ['Hash-Link']
            }
        });
        await new Promise(process.nextTick);

        expect(wrapper.html()).toMatchSnapshot();
    });
});

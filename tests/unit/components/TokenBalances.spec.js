import flushPromises from 'flush-promises';
import MockHelper from '../MockHelper';

import TokenBalances from '@/components/TokenBalances.vue';

describe('TokenBalances.vue', () => {
    let helper;

    beforeEach(() => {
        helper = new MockHelper();
    });

    it('Should display token balances', async (done) => {
        jest.spyOn(helper.mocks.server, 'getTokenBalances')
            .mockResolvedValue({
                data: [
                    { token: '0x123', address: '0xabcd', currentBalance: '99999989989989999000000000000', tokenContract: { name: 'EthernalToken', tokenName: 'Ethernal', tokenSymbol: 'ETL', tokenDecimals: 18 }},
                    { token: '0x456', address: '0xabcd', currentBalance: '999999899899', tokenContract: { name: 'USDCContract', tokenName: 'USDC', tokenSymbol: 'USDC', tokenDecimals: 6 }}
                ]
            });

        const wrapper = helper.mountFn(TokenBalances, {
            stubs: ['Hash-Link']
        });
        await new Promise(process.nextTick);

        expect(wrapper.html()).toMatchSnapshot();
        done();
    });
});

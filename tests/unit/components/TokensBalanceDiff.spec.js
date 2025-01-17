import flushPromises from 'flush-promises';

import TokensBalanceDiff from '@/components/TokensBalanceDiff.vue';

describe('TokensBalanceDiff.vue', () => {
    it('Should display token balances difference', async () => {
        const wrapper = mount(TokensBalanceDiff, {
            props: {
                token: '0xdc64a140aa3e981100a9beca4e685f962f0cf6c9',
                balanceChanges: [
                    {
                        address: '0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266',
                        currentBalance: '99999999870000000000000000000',
                        previousBalance: '99999999880000000000000000000',
                        diff: '-10000000000000000000'
                    },
                    {
                        address: '0x2d481eeb2ba97955cd081cf218f453a817259ab1',
                        currentBalance: '130000000000000000000',
                        previousBalance: '120000000000000000000',
                        diff: '10000000000000000000'
                    }
                ],
                blockNumber: '2'
            },
            global: {
                stubs: ['Hash-Link']
            }
        });
        await flushPromises();

        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should display formatted token balances difference', async () => {
        vi.spyOn(server, 'getContract')
            .mockResolvedValue({ data: { tokenDecimals: 18, tokenSymbol: 'ETL', tokenName: 'Ethernal' }});

        const wrapper = mount(TokensBalanceDiff, {
            props: {
                token: '0xdc64a140aa3e981100a9beca4e685f962f0cf6c9',
                balanceChanges: [
                    {
                        address: '0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266',
                        currentBalance: '99999999870000000000000000000',
                        previousBalance: '99999999880000000000000000000',
                        diff: '-10000000000000000000'
                    },
                    {
                        address: '0x2d481eeb2ba97955cd081cf218f453a817259ab1',
                        currentBalance: '130000000000000000000',
                        previousBalance: '120000000000000000000',
                        diff: '10000000000000000000'
                    }
                ],
                blockNumber: '2'
            },
            global: {
                stubs: ['Hash-Link']
            }
        });
        await flushPromises();

        expect(wrapper.html()).toMatchSnapshot();
    });
});

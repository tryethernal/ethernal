import flushPromises from 'flush-promises';
import TokensBalanceDiff from '@/components/TokensBalanceDiff.vue';

describe('TokensBalanceDiff.vue', () => {
    it('Should display token balances difference without contract info', async () => {
        const wrapper = mount(TokensBalanceDiff, {
            props: {
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
                blockNumber: '2',
                itemsPerPage: 5
            },
            global: {
                stubs: ['Hash-Link']
            }
        });
        await flushPromises();

        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should display formatted token balances difference with contract info', async () => {
        const wrapper = mount(TokensBalanceDiff, {
            props: {
                balanceChanges: [
                    {
                        address: '0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266',
                        currentBalance: '99999999870000000000000000000',
                        previousBalance: '99999999880000000000000000000',
                        diff: '-10000000000000000000',
                        contract: {
                            tokenDecimals: 18,
                            tokenSymbol: 'ETL',
                            tokenName: 'Ethernal'
                        }
                    },
                    {
                        address: '0x2d481eeb2ba97955cd081cf218f453a817259ab1',
                        currentBalance: '130000000000000000000',
                        previousBalance: '120000000000000000000',
                        diff: '10000000000000000000',
                        contract: {
                            tokenDecimals: 18,
                            tokenSymbol: 'ETL',
                            tokenName: 'Ethernal'
                        }
                    }
                ],
                blockNumber: '2',
                itemsPerPage: 5
            },
            global: {
                stubs: ['Hash-Link']
            }
        });
        await flushPromises();

        expect(wrapper.html()).toMatchSnapshot();
    });
});

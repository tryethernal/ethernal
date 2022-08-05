const ethers = require('ethers');
import flushPromises from 'flush-promises';
import MockHelper from '../MockHelper';

import TokensBalanceDiff from '@/components/TokensBalanceDiff.vue';

describe('TokensBalanceDiff.vue', () => {
    let helper;

    beforeEach(() => helper = new MockHelper());

    it('Should display token balances difference', async (done) => {
        const wrapper = helper.mountFn(TokensBalanceDiff, {
            propsData: {
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
            stubs: ['Hash-Link']
        });
        await flushPromises();

        expect(wrapper.html()).toMatchSnapshot();
        done();
    });

    it('Should display formatted token balances difference', async (done) => {
        jest.spyOn(helper.mocks.server, 'getContract')
            .mockResolvedValue({ data: { tokenDecimals: 18, tokenSymbol: 'ETL', tokenName: 'Ethernal' }});

        const wrapper = helper.mountFn(TokensBalanceDiff, {
            propsData: {
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
            stubs: ['Hash-Link']
        });
        await flushPromises();

        expect(wrapper.html()).toMatchSnapshot();
        done();
    });
});

const ethers = require('ethers');
import MockHelper from '../MockHelper';

import TokensBalanceDiff from '@/components/TokensBalanceDiff.vue';

describe('TokensBalanceDiff.vue', () => {
    let helper;

    beforeEach(async () => {
        helper = new MockHelper();
        await helper.mocks.admin.collection('contracts').doc('0x123')
            .set({ timestamp: '1636557049', address: '0x123', contractName: 'Ethernal Token', token: { name: 'Ethernal', symbol: 'ETL', decimals: 18 }, patterns: ['erc20'] });
        await helper.mocks.admin.collection('contracts').doc('0x124')
            .set({ timestamp: '1636557049', address: '0x124', contractName: 'USD Coin', token: { name: 'USDC', symbol: 'USDC', decimals: 6 }, patterns: ['erc20', 'proxy'] });
    
        helper.mocks.server.callContractReadMethod
            .mockImplementationOnce(() => new Promise((resolve) => resolve([ethers.BigNumber.from('100000000000000000000')])))
            .mockImplementationOnce(() => new Promise((resolve) => resolve([ethers.BigNumber.from('1000000000000000000')])))
    });

    it('Should display token balances difference', async (done) => {
        const wrapper = helper.mountFn(TokensBalanceDiff, {
            propsData: {
                contract: {},
                addresses: ['0xabcd'],
                block: '2'
            }
        });

        setTimeout(() => {
            expect(wrapper.html()).toMatchSnapshot();
            done();
        }, 1500);
    });

    afterEach(() => helper.clearFirebase());
});

import MockHelper from '../MockHelper';

import Tokens from '@/components/Tokens.vue';

describe('Tokens.vue', () => {
    let helper;

    beforeEach(async () => {
        helper = new MockHelper();
        await helper.mocks.admin.collection('contracts').doc('0x123')
            .set({ timestamp: '1636557049', address: '0x123', contractName: 'Ethernal Token', token: { name: 'Ethernal', symbol: 'ETL', decimals: 18 }, patterns: ['erc20'] });
        await helper.mocks.admin.collection('contracts').doc('0x124')
            .set({ timestamp: '1636557049', address: '0x124', contractName: 'USD Coin', token: { name: 'USDC', symbol: 'USDC', decimals: 6 }, patterns: ['erc20', 'proxy'] });
    });

    it('Should display token contracts', async (done) => {
        const wrapper = helper.mountFn(Tokens);

        setTimeout(() => {
            expect(wrapper.html()).toMatchSnapshot();
            done();
        }, 1500);
    });

    afterEach(async () => {
        await helper.clearFirebase();
    });
});

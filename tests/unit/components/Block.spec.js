import MockHelper from '../MockHelper';

import Block from '@/components/Block.vue';

describe('Block.vue', () => {
    let helper, db;

    beforeEach(async () => {
        helper = new MockHelper();
    });

    it('Should show the block component', async (done) => {
        const db = helper.mocks.admin;
        const blockData = {
            number: '1',
            gasLimit: '1000000000',
            timestamp: '1621548462',
            hash: '0x98c6edb3bb1124680a97661c1f5794d60617abb57bd1e611d81fc5b941f36d30'
        };
        const transactionData = {
            hash: '0x060034486a819816df57d01eefccbe161d7019f9f3c235e18af07468fb194ef0',
            timestamp: '1621548462',
            from: '0x0',
            to: 'Ox1',
            blockNumber: 1,
            value: '0'
        };

        await db.collection('blocks')
            .doc(blockData.number)
            .set(blockData);

        await db.collection('transactions')
            .doc(transactionData.hash)
            .set(transactionData);

        const wrapper = helper.mountFn(Block, { propsData: { number: '1' }});
        await wrapper.vm.$nextTick();

        setTimeout(() => {
            expect(wrapper.vm.block).toEqual(blockData);
            expect(wrapper.vm.transactions.length).toBe(1);
            expect(wrapper.html()).toMatchSnapshot();

            done();
        }, 1500);
    });

    afterEach(async () => {
        await helper.clearFirebase();
    });
});

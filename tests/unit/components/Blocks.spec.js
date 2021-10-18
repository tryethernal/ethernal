import MockHelper from '../MockHelper';

import Blocks from '@/components/Blocks.vue';

describe('Blocks.vue', () => {
    let helper, db, blocks, transaction;

    beforeEach(() => {
        helper = new MockHelper();
        db = helper.mocks.admin;
    });

    it('Should show the blocks list', async (done) => {
        const blocks = [
            {
                number: '1',
                gasUsed: '100000',
                timestamp: '1621548462',
                hash: '0x98c6edb3bb1124680a97661c1f5794d60617abb57bd1e611d81fc5b941f36d30',
                transactions: [
                    {
                        hash: '0x060034486a819816df57d01eefccbe161d7019f9f3c235e18af07468fb194ef0',
                        timestamp: '1621548462',
                        from: '0x0',
                        to: 'Ox1',
                        blockNumber: 1,
                        value: '0'
                    }
                ]
            },
            {
                number: '2',
                gasUsed: '200000',
                timestamp: '1621548470',
                hash: '0x99c6edb3bb1124680a97661c1f5794d60617abb57bd1e611d81fc5b941f36d30'                
            }
        ];

        for (const block of blocks)
            await db.collection('blocks')
                .doc(block.number)
                .set(block);

        const wrapper = helper.mountFn(Blocks);
        await wrapper.vm.$nextTick();

        setTimeout(() => {
            expect(wrapper.vm.blocks).toEqual(blocks);
            expect(wrapper.html()).toMatchSnapshot();
            done();
        }, 1500);
    });

    it('should show the loading message when empty blocks list', async (done) => {
        const wrapper = helper.mountFn(Blocks);
        await wrapper.vm.$nextTick();

        setTimeout(() => {
            expect(wrapper.html()).toMatchSnapshot();
            done();
        }, 1500);
    });

    afterEach(async () => {
        await helper.clearFirebase();
    });
});

import MockHelper from '../MockHelper';

import Blocks from '@/components/Blocks.vue';

describe('Blocks.vue', () => {
    let helper, blocks;

    beforeEach(() => {
        helper = new MockHelper();
    });

    it('Should show the blocks list', async () => {
        const blocks = [
            {
                number: '2',
                gasUsed: '200000',
                timestamp: '1621548470',
                hash: '0x99c6edb3bb1124680a97661c1f5794d60617abb57bd1e611d81fc5b941f36d30'                
            },
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
            }
        ];

        jest.spyOn(helper.mocks.server, 'getBlocks')
            .mockResolvedValue({ data: { items: blocks, blockCount: 2 }});

        const wrapper = helper.mountFn(Blocks);
        await new Promise(process.nextTick);

        expect(wrapper.vm.blocks).toEqual(blocks);
        expect(wrapper.html()).toMatchSnapshot();
    });

    it('should show the loading message when empty blocks list', async () => {
        jest.spyOn(helper.mocks.server, 'getBlocks')
            .mockResolvedValue({ data: { items: [], blockCount: 0 }});

        const wrapper = helper.mountFn(Blocks);
        await new Promise(process.nextTick);

        expect(wrapper.html()).toMatchSnapshot();
    });
});

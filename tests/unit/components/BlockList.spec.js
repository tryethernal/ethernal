import MockHelper from '../MockHelper';

import BlockList from '@/components/BlockList.vue';

describe('BlockList.vue', () => {
    let helper, blocks;

    beforeEach(() => {
        helper = new MockHelper();
        jest.spyOn(Date, 'now').mockImplementation(() => new Date('2022-08-07T12:33:37.000Z'));
    });

    it('Should display pending blocks', async () => {
        const blocks = [
            {
                number: '2',
                gasUsed: '200000',
                timestamp: '2022-05-06T17:11:26.000Z',
                hash: '0x99c6edb3bb1124680a97661c1f5794d60617abb57bd1e611d81fc5b941f36d30',
                state: 'syncing'
            },
            {
                number: '1',
                gasUsed: '100000',
                timestamp: '2022-05-06T17:11:26.000Z',
                hash: '0x98c6edb3bb1124680a97661c1f5794d60617abb57bd1e611d81fc5b941f36d30',
                transactions: [
                    {
                        hash: '0x060034486a819816df57d01eefccbe161d7019f9f3c235e18af07468fb194ef0',
                        timestamp: '2022-05-06T17:11:26.000Z',
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

        const wrapper = helper.mountFn(BlockList, {
            propsData: {
                withCount: true
            }
        });
        await new Promise(process.nextTick);

        expect(wrapper.vm.blocks).toEqual(blocks);
        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should not show blocks count', async () => {
        const blocks = [
            {
                number: '2',
                gasUsed: '200000',
                timestamp: '2022-05-06T17:11:26.000Z',
                hash: '0x99c6edb3bb1124680a97661c1f5794d60617abb57bd1e611d81fc5b941f36d30'
            },
            {
                number: '1',
                gasUsed: '100000',
                timestamp: '2022-05-06T17:11:26.000Z',
                hash: '0x98c6edb3bb1124680a97661c1f5794d60617abb57bd1e611d81fc5b941f36d30',
                transactions: [
                    {
                        hash: '0x060034486a819816df57d01eefccbe161d7019f9f3c235e18af07468fb194ef0',
                        timestamp: '2022-05-06T17:11:26.000Z',
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

        const wrapper = helper.mountFn(BlockList);
        await new Promise(process.nextTick);

        expect(wrapper.vm.blocks).toEqual(blocks);
        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should show the blocks list', async () => {
        const blocks = [
            {
                number: '2',
                gasUsed: '200000',
                timestamp: '2022-05-06T17:11:26.000Z',
                hash: '0x99c6edb3bb1124680a97661c1f5794d60617abb57bd1e611d81fc5b941f36d30'
            },
            {
                number: '1',
                gasUsed: '100000',
                timestamp: '2022-05-06T17:11:26.000Z',
                hash: '0x98c6edb3bb1124680a97661c1f5794d60617abb57bd1e611d81fc5b941f36d30',
                transactions: [
                    {
                        hash: '0x060034486a819816df57d01eefccbe161d7019f9f3c235e18af07468fb194ef0',
                        timestamp: '2022-05-06T17:11:26.000Z',
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

        const wrapper = helper.mountFn(BlockList, {
            propsData: {
                withCount: true
            }
        });
        await new Promise(process.nextTick);

        expect(wrapper.vm.blocks).toEqual(blocks);
        expect(wrapper.html()).toMatchSnapshot();
    });

    it('should show the loading message when empty blocks list', async () => {
        jest.spyOn(helper.mocks.server, 'getBlocks')
            .mockResolvedValue({ data: { items: [], blockCount: 0 }});

        const wrapper = helper.mountFn(BlockList, {
            propsData: {
                withCount: true
            }
        });
        await new Promise(process.nextTick);

        expect(wrapper.html()).toMatchSnapshot();
    });
});

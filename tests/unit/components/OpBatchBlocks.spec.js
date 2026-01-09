import OpBatchBlocks from '@/components/OpBatchBlocks.vue';

describe('OpBatchBlocks.vue', () => {
    it('Should render BlockList with opBatchIndex prop', async () => {
        const wrapper = mount(OpBatchBlocks, {
            props: {
                batchIndex: 100
            },
            global: {
                stubs: ['BlockList']
            }
        });

        const blockList = wrapper.findComponent({ name: 'BlockList' });
        expect(blockList.exists()).toBe(true);
        expect(blockList.props('opBatchIndex')).toBe(100);
    });
});

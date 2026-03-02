import OrbitBatchBlocks from '@/components/OrbitBatchBlocks.vue';

const stubs = ['Block-List'];

describe('OrbitBatchBlocks.vue', () => {
    it('Should show the component', async () => {
        const wrapper = mount(OrbitBatchBlocks, {
            props: {
                batchNumber: 123
            },
            global: {
                stubs
            }
        });

        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should pass batchNumber prop to Block-List component', async () => {
        const wrapper = mount(OrbitBatchBlocks, {
            props: {
                batchNumber: 456
            },
            global: {
                stubs
            }
        });

        const blockListComponent = wrapper.findComponent({ name: 'Block-List' });
        expect(blockListComponent.exists()).toBe(true);
        expect(blockListComponent.props('batchNumber')).toBe(456);
    });
});

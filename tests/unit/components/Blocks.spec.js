import Blocks from '@/components/Blocks.vue';

describe('Blocks.vue', () => {
    it('Should show the blocks list', async () => {
        const wrapper = mount(Blocks, {
            global: {
                stubs: ['Block-List']
            }
        });
        await new Promise(process.nextTick);

        expect(wrapper.html()).toMatchSnapshot();
    });
});

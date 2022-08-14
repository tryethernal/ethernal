import MockHelper from '../MockHelper';

import Blocks from '@/components/Blocks.vue';

describe('Blocks.vue', () => {
    let helper;

    beforeEach(() => {
        helper = new MockHelper();
    });

    it('Should show the blocks list', async () => {
        const wrapper = helper.mountFn(Blocks, {
            stubs: ['Block-List']
        });
        await new Promise(process.nextTick);

        expect(wrapper.html()).toMatchSnapshot();
    });
});

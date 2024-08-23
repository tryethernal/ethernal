import flushPromises from 'flush-promises';
import MockHelper from '../MockHelper';

import CreateExplorerDexModal from '@/components/CreateExplorerDexModal.vue';

describe('CreateExplorerDexModal.vue', () => {
    let helper;

    beforeEach(() => {
        helper = new MockHelper();
    });

    it('Should show dex creation modal', async () => {
        const wrapper = helper.mountFn(CreateExplorerDexModal);

        wrapper.vm.open();
        await flushPromises();

        expect(wrapper.html()).toMatchSnapshot();
    });
});

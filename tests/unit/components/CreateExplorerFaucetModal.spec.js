import flushPromises from 'flush-promises';
import MockHelper from '../MockHelper';

import CreateExplorerFaucetModal from '@/components/CreateExplorerFaucetModal.vue';

describe('CreateExplorerFaucetModal.vue', () => {
    let helper;

    beforeEach(() => {
        helper = new MockHelper();
    });

    it('Should show faucet creation modal', async () => {
        const wrapper = helper.mountFn(CreateExplorerFaucetModal);

        wrapper.vm.open({ explorerId: 1, token: 'ETL' });
        await flushPromises();

        expect(wrapper.html()).toMatchSnapshot();
    });
});

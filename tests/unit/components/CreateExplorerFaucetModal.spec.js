import flushPromises from 'flush-promises';

import CreateExplorerFaucetModal from '@/components/CreateExplorerFaucetModal.vue';

describe('CreateExplorerFaucetModal.vue', () => {
    it('Should show faucet creation modal', async () => {
        const wrapper = mount(CreateExplorerFaucetModal);

        wrapper.vm.open({ explorerId: 1, token: 'ETL' });
        await flushPromises();

        expect(wrapper.html()).toMatchSnapshot();
    });
});

import flushPromises from 'flush-promises';

import ExplorerFaucetSettingsDangerZone from '@/components/ExplorerFaucetSettingsDangerZone.vue';

describe('ExplorerFaucetSettingsDangerZone.vue', () => {
    const stubs = ['Explorer-Faucet-Private-Key-Export-Modal'];

    it('Should display danger zone', async () => {
        const wrapper = mount(ExplorerFaucetSettingsDangerZone, {
            stubs
        });
        await flushPromises();

        expect(wrapper.html()).toMatchSnapshot();
    });
});

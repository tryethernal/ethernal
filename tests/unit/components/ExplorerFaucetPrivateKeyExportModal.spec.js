import flushPromises from 'flush-promises';

import ExplorerFaucetPrivateKeyExportModal from '@/components/ExplorerFaucetPrivateKeyExportModal.vue';

describe('ExplorerFaucetPrivateKeyExportModal.vue', () => {
    it('Should display private key', async () => {
        vi.spyOn(server, 'getFaucetPrivateKey').mockResolvedValue({ data: { privateKey: '0x123' }});

        const wrapper = mount(ExplorerFaucetPrivateKeyExportModal);
        wrapper.vm.open({ faucetId: 1 });
        await flushPromises();

        expect(wrapper.html()).toMatchSnapshot();
    });
});

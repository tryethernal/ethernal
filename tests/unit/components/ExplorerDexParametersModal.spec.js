import flushPromises from 'flush-promises';

import ExplorerDexParametersModal from '@/components/ExplorerDexParametersModal.vue';

describe('ExplorerDexParametersModal.vue', () => {
    it('Should display dex parameters', async () => {
        const wrapper = mount(ExplorerDexParametersModal, {
            data() {
                return {
                    dialog: true,
                    resolve: vi.fn().mockResolvedValue(),
                    transactionTimeout: 20 * 60 * 60,
                    slippageToleranceInBps: 0.5 * 100
                };
            }
        });
        await flushPromises();

        expect(wrapper.html()).toMatchSnapshot();
    });
});

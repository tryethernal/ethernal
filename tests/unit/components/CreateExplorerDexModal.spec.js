import flushPromises from 'flush-promises';
import CreateExplorerDexModal from '@/components/CreateExplorerDexModal.vue';

describe('CreateExplorerDexModal.vue', () => {
    it('Should show dex creation modal', async () => {
        const wrapper = mount(CreateExplorerDexModal, {
            global: {
                plugins: [createTestingPinia({ initialState: { explorer: { id: 1 } } })]
            }
        });

        wrapper.vm.open();

        await flushPromises();

        expect(wrapper.html()).toMatchSnapshot();
    });
});

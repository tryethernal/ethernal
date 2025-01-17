import flushPromises from 'flush-promises';

import CreateWorkspaceModal from '@/components/CreateWorkspaceModal.vue';

describe('CreateWorkspaceModal.vue', () => {
    it('Should let the user create a new workspace', async () => {
        const wrapper = mount(CreateWorkspaceModal, {
            global: {
                stubs: ['Create-Workspace']
            }
        });

        await wrapper.setData({ dialog: true, resolve: vi.fn() });

        await flushPromises();
        expect(wrapper.html()).toMatchSnapshot();
    });
});

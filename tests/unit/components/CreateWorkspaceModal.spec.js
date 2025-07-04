import CreateWorkspaceModal from '@/components/CreateWorkspaceModal.vue';

const stubs = ['CreateWorkspace']

describe('CreateWorkspaceModal.vue', () => {
    it('Should let the user create a new workspace', async () => {
        const wrapper = mount(CreateWorkspaceModal, {
            global: {
                stubs
            }
        });

        expect(wrapper.html()).toMatchSnapshot();
    });
});

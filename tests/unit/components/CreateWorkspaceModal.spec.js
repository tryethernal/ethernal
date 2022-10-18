import flushPromises from 'flush-promises';
import MockHelper from '../MockHelper';
  
import CreateWorkspaceModal from '@/components/CreateWorkspaceModal.vue';

describe('CreateWorkspaceModal.vue', () => {
    let helper;

    beforeEach(() => {
        helper = new MockHelper();
    });

    it('Should let the user create a new workspace', async () => {
        const wrapper = helper.mountFn(CreateWorkspaceModal, {
            stubs: ['Create-Workspace']
        });

        await wrapper.setData({ dialog: true, resolve: jest.fn() });

        await flushPromises();
        expect(wrapper.html()).toMatchSnapshot();
    });
});

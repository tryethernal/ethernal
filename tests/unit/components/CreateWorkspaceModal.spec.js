import MockHelper from '../MockHelper';
  
import CreateWorkspaceModal from '@/components/CreateWorkspaceModal.vue';

describe('CreateWorkspaceModal.vue', () => {
    let helper;

    beforeEach(() => {
        helper = new MockHelper();
    });

    it('Should let the user create a new workspace', async (done) => {
        const name = 'Hardhat';
        const rpcServer = 'http://127.0.0.1:8545';
        const localNetwork = true;

        const onWorkspaceCreatedMock = jest.spyOn(CreateWorkspaceModal.methods, 'onWorkspaceCreated');
        const wrapper = helper.mountFn(CreateWorkspaceModal);

        await wrapper.setData({ dialog: true, resolve: jest.fn() });

        await wrapper.find('#workspaceName').setValue(name);
        await wrapper.find('#workspaceServer').setValue(rpcServer);
        await wrapper.find('#createWorkspace').trigger('click');

        await wrapper.vm.$nextTick();
        expect(onWorkspaceCreatedMock).toHaveBeenCalled();
        done();
    });

    afterEach(async () => {
        await helper.clearFirebase();
    });    
});

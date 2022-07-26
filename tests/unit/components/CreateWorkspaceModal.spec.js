import flushPromises from 'flush-promises';
import MockHelper from '../MockHelper';
  
import CreateWorkspaceModal from '@/components/CreateWorkspaceModal.vue';

describe('CreateWorkspaceModal.vue', () => {
    let helper;

    beforeEach(() => {
        helper = new MockHelper();
    });

    it('Should let the user create a new workspace', async () => {
        const name = 'Hardhat';
        const rpcServer = 'http://127.0.0.1:8545';

        const onWorkspaceCreatedMock = jest.spyOn(CreateWorkspaceModal.methods, 'onWorkspaceCreated');
        jest.spyOn(helper.mocks.server, 'createWorkspace')
            .mockResolvedValue({ data: { workspace: {
                defaultAccount: '0x2D481eeb2bA97955CD081Cf218f453A817259AB1',
                networkId: 1,
                rpcServer: 'http://127.0.0.1:8545',
                settings: {
                    gasLimit: 1234567
                }
            }}});

        const wrapper = helper.mountFn(CreateWorkspaceModal);

        await wrapper.setData({ dialog: true, resolve: jest.fn() });

        await wrapper.find('#workspaceName').setValue(name);
        await wrapper.find('#workspaceServer').setValue(rpcServer);
        await wrapper.find('#createWorkspace').trigger('click');

        await flushPromises();
        expect(onWorkspaceCreatedMock).toHaveBeenCalled();
    });
});

import flushPromises from 'flush-promises';
import MockHelper from '../MockHelper';

import WorkspaceList from '@/components/WorkspaceList.vue';

describe('WorkspaceList.vue', () => {
    let helper;

    beforeEach(async () => {
        helper = new MockHelper();
    });

    it('Should display workspaces list', async () => {
        jest.spyOn(helper.mocks.server, 'getWorkspaces').mockResolvedValue({ data: [
            { id: 1, name: 'workspace 1', rpcServer: 'http://localhost:8545' },
            { id: 2, name: 'workspace 2', rpcServer: 'http://localhost:8545' }
        ]});

        const wrapper = helper.mountFn(WorkspaceList, {
            stubs: ['Create-Workspace-Modal'],
            getters: {
                currentWorkspace: jest.fn().mockReturnValue({ id: 1 })
            }
        });
        await flushPromises();
        expect(wrapper.html()).toMatchSnapshot();
    });
});

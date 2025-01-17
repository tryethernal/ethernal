import flushPromises from 'flush-promises';

import WorkspaceList from '@/components/WorkspaceList.vue';

describe('WorkspaceList.vue', () => {
    it('Should display workspaces list', async () => {
        vi.spyOn(server, 'getWorkspaces').mockResolvedValue({ data: [
            { id: 1, name: 'workspace 1', rpcServer: 'http://localhost:8545' },
            { id: 2, name: 'workspace 2', rpcServer: 'http://localhost:8545' }
        ]});

        const wrapper = mount(WorkspaceList, {
            global: {
                stubs: ['Create-Workspace-Modal'],
                plugins: [createTestingPinia({
                    initialState: {
                        currentWorkspace: { id: 1 }
                    }
                })],
            }
        });
        await flushPromises();
        expect(wrapper.html()).toMatchSnapshot();
    });
});

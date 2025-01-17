import flushPromises from 'flush-promises';

import CreateExplorerModal from '@/components/CreateExplorerModal.vue';

describe('CreateExplorerModal.vue', () => {
    it('Should let the user choose an existing workspace', async () => {
        vi.spyOn(server, 'getWorkspaces').mockResolvedValueOnce({ data: [{ name: 'my workspace', rpcServer: 'a', networkId: 1 }]});
        vi.spyOn(server, 'getExplorerPlans').mockResolvedValueOnce({ data: [] });

        const wrapper = mount(CreateExplorerModal, {
            global: {
                stubs: ['Create-Workspace', 'Explorer-Plan-Selector']
            }
        });

        wrapper.vm.open();

        await flushPromises();

        expect(server.getWorkspaces).toHaveBeenCalled();
        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should only show creation form if no workspace available', async () => {
        vi.spyOn(server, 'getWorkspaces').mockResolvedValueOnce({ data: [{ explorer: {}}]});
        vi.spyOn(server, 'getExplorerPlans').mockResolvedValueOnce({ data: [] });

        const wrapper = mount(CreateExplorerModal, {
            global: {
                stubs: ['Create-Workspace', 'Explorer-Plan-Selector']
            }
        });

        wrapper.vm.open();

        await flushPromises();

        expect(server.getWorkspaces).toHaveBeenCalled();
        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should skip billing if user is demo account', async () => {
        vi.spyOn(server, 'getWorkspaces').mockResolvedValueOnce({ data: [{ name: 'my workspace', rpcServer: 'a', networkId: 1 }]});
        vi.spyOn(server, 'getExplorerPlans').mockResolvedValueOnce({ data: [] });
        vi.spyOn(server, 'createExplorer').mockResolvedValueOnce({ data: { id: 1 }});

        const wrapper = mount(CreateExplorerModal, {
            global: {
                stubs: ['Create-Workspace', 'Explorer-Plan-Selector'],
                plugins: [createTestingPinia({
                    initialState: {
                        user: { canUseDemoPlan: true },
                        env: { billingEnabled: true }
                    }
                })]
            }
        });

        wrapper.vm.open();
        await wrapper.setData({ workspace: { id: 1 }});

        await wrapper.find('#selectWorkspace').trigger('click');
        await flushPromises();

        expect(server.createExplorer).toHaveBeenCalled();
        expect(router.push).toBeCalledWith({ path: '/explorers/1?status=success'});
    });

    it('Should skip billing if it is not enabled', async () => {
        vi.spyOn(server, 'getWorkspaces').mockResolvedValueOnce({ data: [{ name: 'my workspace', rpcServer: 'a', networkId: 1 }]});
        vi.spyOn(server, 'getExplorerPlans').mockResolvedValueOnce({ data: [] });
        vi.spyOn(server, 'createExplorer').mockResolvedValueOnce({ data: { id: 1 }});

        const wrapper = mount(CreateExplorerModal, {
            global: {
                stubs: ['Explorer-Plan-Card', 'Create-Workspace', 'Explorer-Plan-Selector'],
                plugins: [createTestingPinia({
                    initialState: {
                        env: { billingEnabled: false }
                    }
                })]
            }
        });

        wrapper.vm.open();
        await wrapper.setData({ workspace: { id: 1 }});

        await wrapper.find('#selectWorkspace').trigger('click');
        await flushPromises();

        expect(server.createExplorer).toHaveBeenCalled();
        expect(router.push).toBeCalledWith({ path: '/explorers/1?status=success'});
    });
});

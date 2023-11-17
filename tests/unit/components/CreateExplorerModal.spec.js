import flushPromises from 'flush-promises';
import MockHelper from '../MockHelper';

import CreateExplorerModal from '@/components/CreateExplorerModal.vue';

describe('CreateExplorerModal.vue', () => {
    let helper;

    beforeEach(() => {
        helper = new MockHelper();
    });

    it('Should let the user choose an existing workspace', async () => {
        jest.spyOn(helper.mocks.server, 'getWorkspaces').mockResolvedValueOnce({ data: [{ name: 'my workspace', rpcServer: 'a', networkId: 1 }]});
        jest.spyOn(helper.mocks.server, 'getExplorerPlans').mockResolvedValueOnce({ data: [] });

        const wrapper = helper.mountFn(CreateExplorerModal, {
            stubs: ['Create-Workspace', 'Explorer-Plan-Selector']
        });

        wrapper.vm.open();

        await flushPromises();

        expect(helper.mocks.server.getWorkspaces).toHaveBeenCalled();
        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should only show creation form if no workspace available', async () => {
        jest.spyOn(helper.mocks.server, 'getWorkspaces').mockResolvedValueOnce({ data: [{ explorer: {}}]});
        jest.spyOn(helper.mocks.server, 'getExplorerPlans').mockResolvedValueOnce({ data: [] });

        const wrapper = helper.mountFn(CreateExplorerModal, {
            stubs: ['Create-Workspace', 'Explorer-Plan-Selector']
        });

        wrapper.vm.open();

        await flushPromises();

        expect(helper.mocks.server.getWorkspaces).toHaveBeenCalled();
        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should skip billing if user is demo account', async () => {
        jest.spyOn(helper.mocks.server, 'getWorkspaces').mockResolvedValueOnce({ data: [{ name: 'my workspace', rpcServer: 'a', networkId: 1 }]});
        jest.spyOn(helper.mocks.server, 'getExplorerPlans').mockResolvedValueOnce({ data: [] });
        jest.spyOn(helper.mocks.server, 'createExplorer').mockResolvedValueOnce({ data: { id: 1 }});
        const routerSpy = jest.spyOn(helper.mocks.router, 'push');

        const wrapper = helper.mountFn(CreateExplorerModal, {
            stubs: ['Create-Workspace', 'Explorer-Plan-Selector'],
            getters: {
                isBillingEnabled: jest.fn().mockReturnValue(true),
                user: jest.fn().mockReturnValue({
                    canUseDemoPlan: true
                })
            }
        });

        wrapper.vm.open();
        await wrapper.setData({ workspace: { id: 1 }});

        await wrapper.find('#selectWorkspace').trigger('click');
        await flushPromises();

        expect(helper.mocks.server.createExplorer).toHaveBeenCalled();
        expect(routerSpy).toBeCalledWith({ path: '/explorers/1?status=success'});
    });

    it('Should skip billing if it is not enabled', async () => {
        jest.spyOn(helper.mocks.server, 'getWorkspaces').mockResolvedValueOnce({ data: [{ name: 'my workspace', rpcServer: 'a', networkId: 1 }]});
        jest.spyOn(helper.mocks.server, 'getExplorerPlans').mockResolvedValueOnce({ data: [] });
        jest.spyOn(helper.mocks.server, 'createExplorer').mockResolvedValueOnce({ data: { id: 1 }});
        const routerSpy = jest.spyOn(helper.mocks.router, 'push');

        const wrapper = helper.mountFn(CreateExplorerModal, {
            stubs: ['Explorer-Plan-Card', 'Create-Workspace', 'Explorer-Plan-Selector'],
            getters: {
                isBillingEnabled: jest.fn().mockReturnValue(false)
            }
        });

        wrapper.vm.open();
        await wrapper.setData({ workspace: { id: 1 }});

        await wrapper.find('#selectWorkspace').trigger('click');
        await flushPromises();

        expect(helper.mocks.server.createExplorer).toHaveBeenCalled();
        expect(routerSpy).toBeCalledWith({ path: '/explorers/1?status=success'});
    });
});

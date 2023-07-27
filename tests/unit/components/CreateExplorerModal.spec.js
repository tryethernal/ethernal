import flushPromises from 'flush-promises';
import MockHelper from '../MockHelper';

import CreateExplorerModal from '@/components/CreateExplorerModal.vue';

describe('CreateExplorerModal.vue', () => {
    let helper;

    beforeEach(() => {
        helper = new MockHelper();
    });

    it('Should let the user choose an existing workspace or create a new one', async () => {
        jest.spyOn(helper.mocks.server, 'getWorkspaces').mockResolvedValueOnce([{ name: 'my workspace', rpcServer: 'a', networkId: 1 }]);
        jest.spyOn(helper.mocks.server, 'getExplorerPlans').mockResolvedValueOnce({ data: [] });

        const wrapper = helper.mountFn(CreateExplorerModal, {
            stubs: ['Explorer-Plan-Card', 'Create-Workspace']
        });

        wrapper.vm.open();

        await flushPromises();

        expect(helper.mocks.server.getExplorerPlans).toHaveBeenCalled();
        expect(helper.mocks.server.getWorkspaces).toHaveBeenCalled();
        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should skip billing if it is not enabled', async () => {
        jest.spyOn(helper.mocks.server, 'getWorkspaces').mockResolvedValueOnce([{ name: 'my workspace', rpcServer: 'a', networkId: 1 }]);
        jest.spyOn(helper.mocks.server, 'getExplorerPlans').mockResolvedValueOnce({ data: [] });
        jest.spyOn(helper.mocks.server, 'createExplorer').mockResolvedValueOnce({ data: { id: 1 }});
        const routerSpy = jest.spyOn(helper.mocks.router, 'push');

        const wrapper = helper.mountFn(CreateExplorerModal, {
            stubs: ['Explorer-Plan-Card', 'Create-Workspace'],
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

    it('Should let the user select a plan', async () => {
        jest.spyOn(helper.mocks.server, 'getWorkspaces').mockResolvedValueOnce([{ name: 'my workspace', rpcServer: 'a', networkId: 1 }]);
        jest.spyOn(helper.mocks.server, 'getExplorerPlans').mockResolvedValueOnce({ data: [{ slug: 'slug' }, { slug: 'slug2' }] });
        jest.spyOn(helper.mocks.server, 'createExplorer').mockResolvedValueOnce({ data: { id: 1 }});

        const wrapper = helper.mountFn(CreateExplorerModal, {
            stubs: ['Explorer-Plan-Card', 'Create-Workspace'],
            getters: {
                isBillingEnabled: jest.fn().mockReturnValue(true),
                user: jest.fn().mockReturnValue({ cryptoPaymentEnabled: false })
            }
        });

        await wrapper.setData({ dialog: true, workspace: { id: 1 }});
        wrapper.vm.open();

        await wrapper.find('#selectWorkspace').trigger('click');
        await flushPromises();

        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should start a crypto subscription', async () => {
        jest.spyOn(helper.mocks.server, 'startCryptoSubscription').mockResolvedValueOnce();
        const routerSpy = jest.spyOn(helper.mocks.router, 'push');

        const wrapper = helper.mountFn(CreateExplorerModal, {
            stubs: ['Explorer-Plan-Card', 'Create-Workspace'],
            getters: {
                isBillingEnabled: jest.fn().mockReturnValue(true),
                user: jest.fn().mockReturnValue({ cryptoPaymentEnabled: true })
            }
        });

        await wrapper.setData({
            stepperIndex: 2,
            dialog: true,
            workspace: { id: 1 },
            explorer: { id: 1 },
            plans: [{ slug: 'slug' }, { slug: 'slug2' }]
        });

        wrapper.vm.onPlanSelected('slug');
        await flushPromises();

        expect(helper.mocks.server.startCryptoSubscription).toHaveBeenCalledWith('slug', 1);
        expect(routerSpy).toHaveBeenCalledWith({ path: '/explorers/1?status=success' });
    });

    it('Should redirect to a stripe checkout url', async () => {
        jest.spyOn(helper.mocks.server, 'createStripeExplorerCheckoutSession').mockResolvedValueOnce({ data: {url: 'stripe.com' }});

        const oldLocation = window.location;
        delete window.location;
        window.location = { ...oldLocation, assign: jest.fn() };
        const assignSpy = jest.spyOn(window.location, 'assign');

        const wrapper = helper.mountFn(CreateExplorerModal, {
            stubs: ['Explorer-Plan-Card', 'Create-Workspace'],
            getters: {
                isBillingEnabled: jest.fn().mockReturnValue(true),
                user: jest.fn().mockReturnValue({ cryptoPaymentEnabled: false })
            }
        });

        await wrapper.setData({
            stepperIndex: 2,
            dialog: true,
            workspace: { id: 1 },
            explorer: { id: 1 },
            plans: [{ slug: 'slug' }, { slug: 'slug2' }]
        });

        await wrapper.vm.onPlanSelected('slug');
        await flushPromises();

        expect(helper.mocks.server.createStripeExplorerCheckoutSession).toHaveBeenCalledWith(1, 'slug');
        expect(assignSpy).toHaveBeenCalledWith('stripe.com');
        window.location = oldLocation;
    });
});

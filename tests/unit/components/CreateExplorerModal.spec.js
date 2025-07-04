import flushPromises from 'flush-promises';
import CreateExplorerModal from '@/components/CreateExplorerModal.vue';
import { useUserStore } from '@/stores/user';
import { useEnvStore } from '@/stores/env';

describe('CreateExplorerModal.vue', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('Should show the creation form and allow explorer creation', async () => {
        server.createExplorerFromOptions.mockResolvedValueOnce({ data: { id: 42 } });
        const wrapper = mount(CreateExplorerModal, {
            global: {
                stubs: ['ExplorerPlanSelector'],
                provide: { $router: router }
            }
        });
        useUserStore().canUseDemoPlan = true;
        useEnvStore().isSelfHosted = true;

        wrapper.vm.open();
        wrapper.vm.name = 'Test Explorer';
        wrapper.vm.rpcServer = 'ws://localhost:8545';
        wrapper.vm.valid = true;
        await wrapper.find('form').trigger('submit.prevent');
        await flushPromises();

        expect(server.createExplorerFromOptions).toHaveBeenCalledWith('Test Explorer', 'ws://localhost:8545');
        expect(router.push).toHaveBeenCalledWith({ path: '/explorers/42?status=success' });
        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should show error if explorer creation fails', async () => {
        server.createExplorerFromOptions.mockRejectedValueOnce({ response: { data: 'Creation failed' } });
        const wrapper = mount(CreateExplorerModal, {
            global: {
                stubs: ['ExplorerPlanSelector'],
                provide: { $router: router }
            }
        });
        useUserStore().canUseDemoPlan = true;
        useEnvStore().isSelfHosted = true;

        wrapper.vm.open();
        wrapper.vm.name = 'Test Explorer';
        wrapper.vm.rpcServer = 'ws://localhost:8545';
        wrapper.vm.valid = true;
        await wrapper.find('form').trigger('submit.prevent');
        await flushPromises();

        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should go to plan selection if not self-hosted and not demo', async () => {
        server.createExplorerFromOptions.mockResolvedValueOnce({ data: { id: 99 } });
        const wrapper = mount(CreateExplorerModal, {
            global: {
                stubs: ['ExplorerPlanSelector'],
                provide: { $router: router }
            }
        });
        useUserStore().canUseDemoPlan = false;
        useEnvStore().isSelfHosted = false;
        useEnvStore().mainDomain = 'test.com';

        wrapper.vm.open();
        wrapper.vm.name = 'Test Explorer';
        wrapper.vm.rpcServer = 'ws://localhost:8545';
        wrapper.vm.valid = true;
        await wrapper.find('form').trigger('submit.prevent');
        await flushPromises();

        expect(wrapper.vm.stepperIndex).toBe(2);
        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should redirect after planCreated event', async () => {
        const wrapper = mount(CreateExplorerModal, {
            global: {
                stubs: ['ExplorerPlanSelector'],
                provide: { $router: router }
            }
        });
        wrapper.vm.explorer = { id: 123 };
        wrapper.vm.planCreated();
        expect(router.push).toHaveBeenCalledWith({ path: `/explorers/123?status=success` });
    });
});

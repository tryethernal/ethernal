import flushPromises from 'flush-promises';

import MigrateExplorerModal from '@/components/MigrateExplorerModal.vue';

describe('MigrateExplorerModal.vue', () => {
    it('Should display plan selector if trial not available', async () => {
        vi.spyOn(server, 'getExplorer').mockRejectedValueOnce(null);
        const wrapper = mount(MigrateExplorerModal, {
            global: {
                plugins: [createTestingPinia({
                    initialState: {
                        user: { canTrial: false },
                        env: { mainDomain: 'ethernal.local:8080' }
                    }
                })],
                stubs: ['Explorer-Plan-Selector']
            }
        });
        wrapper.vm.open({
            explorerId: 1,
            explorerToken: 'token'
        });

        await flushPromises();
        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should display loading while waiting for trial setup to be finalized', async () => {
        vi.spyOn(server, 'migrateDemoExplorer').mockRejectedValueOnce(null);
        const wrapper = mount(MigrateExplorerModal, {
            global: {
                plugins: [createTestingPinia({
                    initialState: {
                        user: { canTrial: true },
                        env: { mainDomain: 'ethernal.local:8080' }
                    }
                })],
                stubs: ['Explorer-Plan-Selector']
            }
        });
        wrapper.vm.open({
            explorerId: 1,
            explorerToken: 'token'
        });

        await flushPromises();
        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should display loading while waiting for the migration to be finalized', async () => {
        vi.spyOn(server, 'getExplorer').mockRejectedValueOnce(null);
        const wrapper = mount(MigrateExplorerModal, {
            global: {
                plugins: [createTestingPinia({
                    initialState: {
                        user: { canTrial: false },
                        env: { mainDomain: 'ethernal.local:8080' }
                    }
                })],
                stubs: ['Explorer-Plan-Selector']
            }
        });
        wrapper.vm.open({
            explorerId: 1,
            explorerToken: 'token',
            justMigrated: true
        });

        await flushPromises();
        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should display success screen once trial is finalized', async () => {
        vi.spyOn(server, 'migrateDemoExplorer').mockResolvedValueOnce();
        vi.spyOn(server, 'getExplorer').mockResolvedValueOnce({ data: { isDemo: false, userId: 1 }});
        const wrapper = mount(MigrateExplorerModal, {
            global: {
                plugins: [createTestingPinia({
                    initialState: {
                        user: { id: 1, canTrial: true },
                        env: { mainDomain: 'ethernal.local:8080' }
                    }
                })],
                stubs: ['Explorer-Plan-Selector']
            }
        });
        wrapper.vm.open({
            explorerId: 1,
            explorerToken: 'token'
        });

        await flushPromises();
        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should display success screen once migration is finalized', async () => {
        vi.spyOn(server, 'getExplorer').mockResolvedValueOnce({ data: { userId: 1, isDemo: false }});
        const wrapper = mount(MigrateExplorerModal, {
            global: {
                plugins: [createTestingPinia({
                    initialState: {
                        user: { id: 1, canTrial: false },
                        env: { mainDomain: 'ethernal.local:8080' }
                    }
                })],
                stubs: ['Explorer-Plan-Selector']
            }
        });
        wrapper.vm.open({
            explorerId: 1,
            explorerToken: 'token',
            justMigrated: true
        });

        await flushPromises();
        expect(wrapper.html()).toMatchSnapshot();
    });
});

import flushPromises from 'flush-promises';
import MockHelper from '../MockHelper';

import MigrateExplorerModal from '@/components/MigrateExplorerModal.vue';

let helper;
beforeEach(() => {
    jest.clearAllMocks()
    helper = new MockHelper();
});

describe('MigrateExplorerModal.vue', () => {
    it('Should display plan selector if trial not available', async () => {
        jest.spyOn(helper.mocks.server, 'getExplorer').mockRejectedValueOnce(null);
        const wrapper = helper.mountFn(MigrateExplorerModal, {
            stubs: ['Explorer-Plan-Selector'],
            getters: {
                user: jest.fn(() => ({ canTrial: false }))
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
        jest.spyOn(helper.mocks.server, 'migrateDemoExplorer').mockRejectedValueOnce(null);
        const wrapper = helper.mountFn(MigrateExplorerModal, {
            stubs: ['Explorer-Plan-Selector'],
            getters: {
                user: jest.fn(() => ({ canTrial: true }))
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
        jest.spyOn(helper.mocks.server, 'getExplorer').mockRejectedValueOnce(null);
        const wrapper = helper.mountFn(MigrateExplorerModal, {
            stubs: ['Explorer-Plan-Selector'],
            getters: {
                user: jest.fn(() => ({ canTrial: false }))
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
        jest.spyOn(helper.mocks.server, 'migrateDemoExplorer').mockResolvedValueOnce();
        jest.spyOn(helper.mocks.server, 'getExplorer').mockResolvedValueOnce({ data: { isDemo: false, userId: 1 }});
        const wrapper = helper.mountFn(MigrateExplorerModal, {
            stubs: ['Explorer-Plan-Selector'],
            getters: {
                user: jest.fn(() => ({ id: 1, canTrial: true }))
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
        jest.spyOn(helper.mocks.server, 'getExplorer').mockResolvedValueOnce({ data: { userId: 1, isDemo: false }});
        const wrapper = helper.mountFn(MigrateExplorerModal, {
            stubs: ['Explorer-Plan-Selector'],
            getters: {
                user: jest.fn(() => ({ id: 1, canTrial: false }))
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

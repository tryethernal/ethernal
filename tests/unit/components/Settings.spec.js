import MockHelper from '../MockHelper';

import Settings from '@/components/Settings.vue';

describe('Settings.vue', () => {
    let helper;

    beforeEach(async () => {
        window.Stripe = jest.fn();
        helper = new MockHelper({
            currentWorkspace: {
                name: 'Hardhat',
                chain: 'ethereum',
                rpcServer: 'http://localhost:8545',
                networkId: 1,
                settings: {}
            }
        });
        await helper.mocks.admin.workspaces().doc('Hardhat').set({ settings: { defaultAccount: '', gasPrice: '', gasLimit: '12345678' }});
    });

    it('Should load the settings page', async (done) => {
        const wrapper = helper.mountFn(Settings);
        setTimeout(() => {
            expect(wrapper.html()).toMatchSnapshot();
            done();
        }, 2000);
    });

    it('Should let the user update general options', async (done) => {
        const updateWorkspaceSettingsMock = jest.spyOn(helper.mocks.server, 'updateWorkspaceSettings');
        const wrapper = helper.mountFn(Settings);

        setTimeout(async () => {
            await wrapper.find('#rpcServer').setValue('http://localhost:1234');
            await wrapper.find('#chain').setValue('ethereum');
            await wrapper.find('#updateOptions').trigger('click');

            await wrapper.vm.$nextTick();

            expect(updateWorkspaceSettingsMock).toHaveBeenCalledWith('Hardhat', { chain: 'ethereum', rpcServer: 'http://localhost:1234', settings: expect.anything() });
            expect(helper.actions.updateCurrentWorkspace).toHaveBeenCalledWith(expect.anything(), {
                rpcServer: 'http://localhost:1234',
                chain: 'ethereum',
                networkId: 1,
                settings: expect.anything(),
                name: 'Hardhat'
            });
            expect(wrapper.html()).toMatchSnapshot();
            done();
        }, 1000)
    });

    it('Should let the user update call options', async (done) => {
        const updateWorkspaceSettingsMock = jest.spyOn(helper.mocks.server, 'updateWorkspaceSettings');
        const wrapper = helper.mountFn(Settings);

        setTimeout(async () => {
            await wrapper.find('#defaultAccount').setValue('0x123');
            await wrapper.find('#gasPrice').setValue('1234');
            await wrapper.find('#gasLimit').setValue('12345');
            await wrapper.find('#updateCallOptions').trigger('click');

            await wrapper.vm.$nextTick();

            expect(updateWorkspaceSettingsMock).toHaveBeenCalledWith('Hardhat', { chain: 'ethereum', rpcServer: 'http://localhost:8545', settings: { defaultAccount: '0x123', gasPrice: '1234', gasLimit: '12345' }});
            expect(helper.actions.updateCurrentWorkspace).toHaveBeenCalledWith(expect.anything(), {
                rpcServer: 'http://localhost:8545',
                chain: 'ethereum',
                networkId: 1,
                settings: {
                    defaultAccount: '0x123',
                    gasPrice: '1234',
                    gasLimit: '12345'
                },
                name: 'Hardhat'
            });
            expect(wrapper.html()).toMatchSnapshot();
            done();
        }, 1000)
    });

    it('Should let the user switch workspaces', async (done) => {
        await helper.mocks.admin.workspaces().doc('Ganache').set({ rpcServer: 'http://localhost:9545', name: 'Ganache' });
        const setCurrentWorkspaceMock = jest.spyOn(helper.mocks.server, 'setCurrentWorkspace');
        const wrapper = helper.mountFn(Settings);

        setTimeout(async () => {
            await wrapper.find('#switchTo-Ganache').trigger('click');
            expect(setCurrentWorkspaceMock).toHaveBeenCalledWith('Ganache');
            expect(wrapper.html()).toMatchSnapshot();

            done();
        }, 2000);
    });

    it('Should not display the tracing warning message for premium users', async (done) => {
        helper.getters.user.mockImplementation(() => { return { plan: 'premium' }});
        await helper.mocks.admin.workspaces().doc('Ganache').set({ rpcServer: 'http://localhost:9545', name: 'Ganache' });
        const wrapper = helper.mountFn(Settings);

        setTimeout(async () => {
            expect(wrapper.html()).toMatchSnapshot();
            done();
        }, 1000);
    });

    it('Should let the user reset the workspace', async (done) => {
        const resetWorkspaceMock = jest.spyOn(helper.mocks.server, 'resetWorkspace');
        const wrapper = helper.mountFn(Settings);
        
        const confirmMock = jest.spyOn(window, 'confirm');
        confirmMock.mockImplementation(jest.fn(() => true));

        setTimeout(async () => {
            await wrapper.find('#resetWorkspace').trigger('click');
            expect(confirmMock).toHaveBeenCalled();
            expect(resetWorkspaceMock).toHaveBeenCalledWith('Hardhat');
            done();
        }, 1000);
    });

    afterEach(async () => {
        await helper.clearFirebase();
    });
});

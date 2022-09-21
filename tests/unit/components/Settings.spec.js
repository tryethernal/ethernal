import flushPromises from 'flush-promises';
import MockHelper from '../MockHelper';

import Settings from '@/components/Settings.vue';

describe('Settings.vue', () => {
    let helper;
    const { reload } = window.location;

    beforeEach(async () => {
        window.Stripe = jest.fn();
        helper = new MockHelper({
            currentWorkspace: {
                alchemyIntegrationEnabled: false,
                defaultAccount: null,
                gasLimit: null,
                gasPrice: null,
                tracing: null,
                name: 'Hardhat',
                chain: 'ethereum',
                rpcServer: 'http://localhost:8545',
                networkId: 1,
                settings: {}
            }
        });
    });

    it('Should load the settings page', async () => {
        jest.spyOn(helper.mocks.server, 'getWorkspaces')
            .mockResolvedValueOnce({ data: [{ id: 'Hardhat', name: 'Hardhat', rpcServer: 'http://localhost:1234' }]})
        const wrapper = helper.mountFn(Settings);
        await new Promise(process.nextTick);
        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should let the user update general options', async () => {
        const updateWorkspaceSettingsMock = jest.spyOn(helper.mocks.server, 'updateWorkspaceSettings');

        const wrapper = helper.mountFn(Settings);
        await flushPromises();

        await wrapper.find('#rpcServer').setValue('http://localhost:1234');
        await wrapper.find('#chain').setValue('bsc');
        await wrapper.find('#updateOptions').trigger('click');
        await flushPromises();

        expect(updateWorkspaceSettingsMock).toHaveBeenCalledWith('Hardhat', { chain: 'bsc', rpcServer: 'http://localhost:1234', settings: expect.anything() });
        expect(helper.actions.updateCurrentWorkspace).toHaveBeenCalledWith(expect.anything(), {
            alchemyIntegrationEnabled: false,
            defaultAccount: null,
            gasLimit: null,
            gasPrice: null,
            tracing: null,
            rpcServer: 'http://localhost:1234',
            chain: 'bsc',
            networkId: 1,
            name: 'Hardhat'
        });
    });

    it('Should let the user update call options', async () => {
        const updateWorkspaceSettingsMock = jest.spyOn(helper.mocks.server, 'updateWorkspaceSettings');
        
        const wrapper = helper.mountFn(Settings);
        await flushPromises();

        await wrapper.find('#defaultAccount').setValue('0x123');
        await wrapper.find('#gasPrice').setValue('1234');
        await wrapper.find('#gasLimit').setValue('12345');
        await wrapper.find('#updateCallOptions').trigger('click');
        await flushPromises();

        expect(updateWorkspaceSettingsMock).toHaveBeenCalledWith('Hardhat', { chain: 'ethereum', rpcServer: 'http://localhost:8545', settings: { defaultAccount: '0x123', gasPrice: '1234', gasLimit: '12345' }});
        expect(helper.actions.updateCurrentWorkspace).toHaveBeenCalledWith(expect.anything(), {
            alchemyIntegrationEnabled: false,
            rpcServer: 'http://localhost:8545',
            chain: 'ethereum',
            networkId: 1,
            defaultAccount: '0x123',
            gasPrice: '1234',
            gasLimit: '12345',
            name: 'Hardhat',
            tracing: null
        });
    });

    it('Should let the user switch workspaces', async () => {
        jest.spyOn(helper.mocks.server, 'getWorkspaces')
            .mockResolvedValueOnce({ data: [{ id: 'Ganache', name: 'Ganache', rpcServer: 'http://localhost:1234' }]});

        const setCurrentWorkspaceMock = jest.spyOn(helper.mocks.server, 'setCurrentWorkspace');
        
        const wrapper = helper.mountFn(Settings);
        await flushPromises();

        await wrapper.find('#switchTo-Ganache').trigger('click');
        await flushPromises();

        expect(setCurrentWorkspaceMock).toHaveBeenCalledWith('Ganache');
    });

    it('Should let the user reset the workspace', async () => {
        const resetWorkspaceMock = jest.spyOn(helper.mocks.server, 'resetWorkspace');
        const wrapper = helper.mountFn(Settings);
        await flushPromises();
        
        const confirmMock = jest.spyOn(window, 'confirm');
        confirmMock.mockReturnValue(true);

        jest.spyOn(window, 'alert').mockReturnValue(true);

        await wrapper.find('#resetWorkspace').trigger('click');
        await flushPromises();

        expect(confirmMock).toHaveBeenCalled();
        expect(resetWorkspaceMock).toHaveBeenCalledWith('Hardhat');
    });
});

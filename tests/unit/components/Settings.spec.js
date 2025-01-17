import flushPromises from 'flush-promises';

import Settings from '@/components/Settings.vue';

describe('Settings.vue', () => {
    beforeEach(async () => {
        window.Stripe = vi.fn();
    });

    it('Should not display the Billing tab if stripe is disabled', async () => {
        vi.spyOn(server, 'getWorkspaces')
            .mockResolvedValueOnce({ data: [{ id: 'Hardhat', name: 'Hardhat', rpcServer: 'http://localhost:1234' }]})
        const wrapper = mount(Settings, {
            global: {
                stubs: ['Workspace-List', 'Billing', 'Account'],
                plugins: [createTestingPinia({
                    initialState: {
                        env: { isBillingEnabled: false }
                    }
                })]
            }
        });
        await new Promise(process.nextTick);
        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should load the settings page', async () => {
        vi.spyOn(server, 'getWorkspaces')
            .mockResolvedValueOnce({ data: [{ id: 'Hardhat', name: 'Hardhat', rpcServer: 'http://localhost:1234' }]})
        const wrapper = mount(Settings, {
            global: {
                stubs: ['Workspace-List', 'Billing', 'Account']
            }
        });
        await new Promise(process.nextTick);
        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should let the user update general options', async () => {
        const updateWorkspaceSettingsMock = vi.spyOn(server, 'updateWorkspaceSettings');

        const wrapper = mount(Settings, {
            global: {
                stubs: ['Workspace-List', 'Billing', 'Account'],
                plugins: [createTestingPinia({
                    initialState: {
                        currentWorkspace: { id: 1, name: 'Hardhat', rpcServer: 'http://localhost:8545', defaultAccount: '0x123' },
                    }
                })],
                mocks: {
                    $route: { query: { tab: 'workspace' }}
                }
            }
        });
        await flushPromises();

        await wrapper.find('#rpcServer').setValue('http://localhost:1234');
        await wrapper.find('#chain').setValue('ethereum');
        await wrapper.find('#updateOptions').trigger('click');
        await flushPromises();

        expect(updateWorkspaceSettingsMock).toHaveBeenCalledWith({ name: 'Hardhat', chain: 'ethereum', rpcServer: 'http://localhost:1234', settings: { defaultAccount: '0x123', gasLimit: null, gasPrice: null }});
    });

    it('Should let the user update call options', async () => {
        const updateWorkspaceSettingsMock = vi.spyOn(server, 'updateWorkspaceSettings');

        const wrapper = mount(Settings, {
            global: {
                stubs: ['Workspace-List', 'Billing', 'Account'],
                plugins: [createTestingPinia({
                    initialState: {
                        currentWorkspace: { id: 1, name: 'Hardhat', rpcServer: 'http://localhost:8545', defaultAccount: '0x123' }
                    }
                })],
                mocks: {
                    $route: { query: { tab: 'workspace' }}
                }
            }
        });

        await flushPromises();

        await wrapper.find('#defaultAccount').setValue('0x123');
        await wrapper.find('#gasPrice').setValue('1234');
        await wrapper.find('#gasLimit').setValue('12345');
        await wrapper.find('#updateCallOptions').trigger('click');
        await flushPromises();

        expect(updateWorkspaceSettingsMock).toHaveBeenCalledWith({ name: 'Hardhat', chain: 'ethereum', rpcServer: 'http://localhost:8545', settings: { defaultAccount: '0x123', gasPrice: '1234', gasLimit: '12345' }});
    });

    it('Should let the user reset the workspace', async () => {
        const resetWorkspaceMock = vi.spyOn(server, 'resetWorkspace')
            .mockResolvedValueOnce({ data: { needsBatchReset: false }});
        const wrapper = mount(Settings, {
            global: {
                stubs: ['Workspace-List', 'Billing', 'Account'],
                plugins: [createTestingPinia({
                    initialState: {
                        currentWorkspace: { id: 1, name: 'Hardhat', rpcServer: 'http://localhost:8545', defaultAccount: '0x123' }
                    }
                })],
                mocks: {
                    $route: { query: { tab: 'workspace' }}
                }
            }
        });
        await flushPromises();

        const confirmMock = vi.spyOn(window, 'confirm');
        confirmMock.mockReturnValue(true);

        vi.spyOn(window, 'alert').mockReturnValue(true);

        await wrapper.find('#resetWorkspace').trigger('click');
        await flushPromises();

        expect(confirmMock).toHaveBeenCalled();
        expect(resetWorkspaceMock).toHaveBeenCalled();
    });
});

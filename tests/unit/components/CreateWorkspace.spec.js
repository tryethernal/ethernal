import flushPromises from 'flush-promises';
import MockHelper from '../MockHelper';

import CreateWorkspace from '@/components/CreateWorkspace.vue';

describe('CreateWorkspace.vue', () => {
    let helper;

    beforeEach(() => {
        helper = new MockHelper();
    });

    it('Should display a warning message if user has already been onboarded & on a free plan', () => {
        const wrapper = helper.mountFn(CreateWorkspace, {
            getters: {
                user: jest.fn().mockReturnValue({
                    plan: 'free',
                    onboarded: true
                })
            }
        });
        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should not display a warning message if user has already been onboarded & on a premium plan', () => {
        const wrapper = helper.mountFn(CreateWorkspace, {
            getters: {
                user: jest.fn().mockReturnValue({
                    plan: 'premium',
                    onboard: true
                })
            }
        });
        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should let the user create a new workspace', async () => {
        const name = 'Hardhat';
        const rpcServer = 'http://127.0.0.1:8545';
        jest.spyOn(helper.mocks.server, 'getRpcAccounts')
            .mockResolvedValue(['0x123', '0x456']);

        const initRpcServerMock = jest.spyOn(helper.mocks.server, 'initRpcServer')
            .mockResolvedValue({
                rpcServer: rpcServer,
                networkId: 1,
                settings: {
                    gasLimit: 1234567
                },
                defaultAccount: '0x2D481eeb2bA97955CD081Cf218f453A817259AB1'
            });

        const createWorkspaceMock = jest.spyOn(helper.mocks.server, 'createWorkspace')
            .mockResolvedValue({ data: { workspace: {
                defaultAccount: '0x2D481eeb2bA97955CD081Cf218f453A817259AB1',
                networkId: 1,
                rpcServer: 'http://127.0.0.1:8545',
                settings: {
                    gasLimit: 1234567
                }
            }}});

        const wrapper = helper.mountFn(CreateWorkspace, { propsData: { existingWorkspaces: [] }});

        await wrapper.find('#workspaceName').setValue(name);
        await wrapper.find('#workspaceServer').setValue(rpcServer);

        await wrapper.find('#createWorkspace').trigger('click');

        await flushPromises();

        expect(initRpcServerMock).toHaveBeenCalledWith(rpcServer);
        expect(createWorkspaceMock).toHaveBeenCalledWith(name, {
            chain: 'ethereum',
            rpcServer: rpcServer,
            networkId: 1,
            settings: {
                gasLimit: 1234567
            },
            defaultAccount: '0x2D481eeb2bA97955CD081Cf218f453A817259AB1'
        });

        expect(wrapper.emitted().workspaceCreated[0]).toEqual([{
            workspace: {
                rpcServer: rpcServer,
                networkId: 1,
                settings: {
                    gasLimit: 1234567
                },
                defaultAccount: '0x2D481eeb2bA97955CD081Cf218f453A817259AB1'
            }
        }]);
    });

    it('Should display an error if it cannot connect to the chain', async () => {
        const name = 'Hardhat';
        const rpcServer = 'http://127.0.0.1';

        jest.spyOn(helper.mocks.server, 'initRpcServer').mockImplementation(() => {
            throw { reason: 'Invalid JSON RPC response' }
        });

        const initRpcServerMock = jest.spyOn(helper.mocks.server, 'initRpcServer')
        const createWorkspaceMock = jest.spyOn(helper.mocks.server, 'createWorkspace');
        const wrapper = helper.mountFn(CreateWorkspace, { propsData: { existingWorkspaces: [] }});

        await wrapper.find('#workspaceName').setValue(name);
        await wrapper.find('#workspaceServer').setValue(rpcServer);

        await wrapper.find('#createWorkspace').trigger('click');

        await wrapper.vm.$nextTick();

        expect(wrapper.emitted().workspaceCreated).toBeFalsy();
        expect(wrapper.vm.errorMessage).toMatch(/Can't connect to <b>/);
        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should display a warning if browser is Brave', async () => {
        jest.spyOn(navigator, 'vendor', 'get').mockReturnValue('Not Safari');
        const wrapper = helper.mountFn(CreateWorkspace, { propsData: { existingWorkspaces: [] }});

        await wrapper.setData({ isUsingBrave: true})

        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should display a warning if browser is Safari', () => {
        jest.spyOn(navigator, 'vendor', 'get').mockReturnValue('apple');
        const wrapper = helper.mountFn(CreateWorkspace, { propsData: { existingWorkspaces: [] }});

        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should display a warning if trying to connect to an endpoint in a local network', async () => {
        const rpcServer = 'http://192.168.0.10';

        const wrapper = helper.mountFn(CreateWorkspace, { propsData: { existingWorkspaces: [] }});
        await wrapper.find('#workspaceServer').setValue(rpcServer);

        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should not display a warning if trying to connect to localhost', async () => {
        const rpcServer = 'http://127.0.0.1';

        const wrapper = helper.mountFn(CreateWorkspace, { propsData: { existingWorkspaces: [] }});
        await wrapper.find('#workspaceServer').setValue(rpcServer);

        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should display locally running networks', async () => {
        const wrapper = helper.mountFn(CreateWorkspace, { propsData: { existingWorkspaces: [] }});
        await wrapper.find('#detectServers').trigger('click');
        await wrapper.vm.$nextTick();
        await wrapper.find('#serverDetected-0').trigger('click');

        expect(wrapper.vm.rpcServer).toBe('http://127.0.0.1:8545');
        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should not allow multiple workspaces with the same name', async () => {
        const wrapper = helper.mountFn(CreateWorkspace, { propsData: { existingWorkspaces: ['Hardhat'] }});

        await wrapper.find('#workspaceName').setValue('Hardhat');
        await wrapper.find('#workspaceServer').setValue('http://127.0.0.1:8545');

        await wrapper.find('#createWorkspace').trigger('click');

        await wrapper.vm.$nextTick();
        expect(wrapper.vm.errorMessage).toBe('A workspace with this name already exists.');
        expect(wrapper.html()).toMatchSnapshot();
    });
});

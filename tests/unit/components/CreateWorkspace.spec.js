import MockHelper from '../MockHelper';

import CreateWorkspace from '@/components/CreateWorkspace.vue';

describe('CreateWorkspace.vue', () => {
    let helper;

    beforeEach(() => {
        helper = new MockHelper();
    });

    it('Should display a warning message if user has already been onboarded & on a free plan', async (done) => {
        helper.getters.user.mockImplementation(() => { return { plan: 'free', onboarded: true }});
        const wrapper = helper.mountFn(CreateWorkspace);
        expect(wrapper.html()).toMatchSnapshot();
        done();
    });

    it('Should not display a warning message if user has already been onboarded & on a premium plan', async (done) => {
        helper.getters.user.mockImplementation(() => { return { plan: 'premium', onboarded: true }});
        const wrapper = helper.mountFn(CreateWorkspace);
        expect(wrapper.html()).toMatchSnapshot();
        done();
    });

    it('Should let the user create a new workspace', async (done) => {
        const name = 'Hardhat';
        const rpcServer = 'http://127.0.0.1:8545';
        const localNetwork = true;
        const initRpcServerMock = jest.spyOn(helper.mocks.server, 'initRpcServer');
        const createWorkspaceMock = jest.spyOn(helper.mocks.server, 'createWorkspace');

        const wrapper = helper.mountFn(CreateWorkspace, { propsData: { existingWorkspaces: [] }});

        await wrapper.find('#workspaceName').setValue(name);
        await wrapper.find('#workspaceServer').setValue(rpcServer);

        await wrapper.find('#createWorkspace').trigger('click');

        await wrapper.vm.$nextTick();

        expect(initRpcServerMock).toHaveBeenCalledWith(rpcServer, localNetwork);
        expect(createWorkspaceMock).toHaveBeenCalledWith(name, {
            rpcServer: rpcServer,
            networkId: 1,
            settings: {
                gasLimit: 1234567
            },
            defaultAccount: '0x2D481eeb2bA97955CD081Cf218f453A817259AB1',
            localNetwork: localNetwork
        });

        expect(wrapper.emitted().workspaceCreated[0]).toEqual([{
            localNetwork: localNetwork,
            name: name,
            workspace: {
                rpcServer: rpcServer,
                networkId: 1,
                settings: {
                    gasLimit: 1234567
                },
                defaultAccount: '0x2D481eeb2bA97955CD081Cf218f453A817259AB1',
                localNetwork: localNetwork
            }
        }]);
        done();
    });

    it('Should display an error if it cannot connect to the chain', async (done) => {
        const name = 'Hardhat';
        const rpcServer = 'http://127.0.0.1';
        const localNetwork = true;

        helper.mocks.server.initRpcServer = () => {
            throw { reason: 'Invalid JSON RPC response' }
        };

        const initRpcServerMock = jest.spyOn(helper.mocks.server, 'initRpcServer');
        const createWorkspaceMock = jest.spyOn(helper.mocks.server, 'createWorkspace');
        const wrapper = helper.mountFn(CreateWorkspace, { propsData: { existingWorkspaces: [] }});

        await wrapper.find('#workspaceName').setValue(name);
        await wrapper.find('#workspaceServer').setValue(rpcServer);

        await wrapper.find('#createWorkspace').trigger('click');

        await wrapper.vm.$nextTick();

        expect(wrapper.emitted().workspaceCreated).toBeFalsy();
        expect(wrapper.vm.errorMessage).toMatch(/Can't connect to <b>/);
        expect(wrapper.html()).toMatchSnapshot();
        done();
    });

    it('Should display a warning if browser is Brave', async (done) => {
        jest.spyOn(navigator, 'vendor', 'get').mockReturnValue('Not Safari');
        const wrapper = helper.mountFn(CreateWorkspace, { propsData: { existingWorkspaces: [] }});

        await wrapper.setData({ isUsingBrave: true})

        expect(wrapper.html()).toMatchSnapshot();
        done();
    });

    it('Should display a warning if browser is Safari', async (done) => {
        jest.spyOn(navigator, 'vendor', 'get').mockReturnValue('apple');
        const wrapper = helper.mountFn(CreateWorkspace, { propsData: { existingWorkspaces: [] }});

        expect(wrapper.html()).toMatchSnapshot();
        done();
    });

    it('Should display a warning if trying to connect to an endpoint in a local network', async (done) => {
        const rpcServer = 'http://192.168.0.10';

        const wrapper = helper.mountFn(CreateWorkspace, { propsData: { existingWorkspaces: [] }});
        await wrapper.find('#workspaceServer').setValue(rpcServer);

        expect(wrapper.vm.localNetwork).toBe(true);
        expect(wrapper.html()).toMatchSnapshot();
        done();
    });

    it('Should display a warning if trying to connect to an endpoint in a local network that does not look like one', async (done) => {
        const rpcServer = 'http://150.34.10.10';

        const wrapper = helper.mountFn(CreateWorkspace, { propsData: { existingWorkspaces: [] }});
        await wrapper.find('#workspaceServer').setValue(rpcServer);
        await wrapper.setData({ localNetwork: true})

        expect(wrapper.html()).toMatchSnapshot();
        done();
    });

    it('Should not display a warning if trying to connect to localhost', async (done) => {
        const rpcServer = 'http://127.0.0.1';

        const wrapper = helper.mountFn(CreateWorkspace, { propsData: { existingWorkspaces: [] }});
        await wrapper.find('#workspaceServer').setValue(rpcServer);

        expect(wrapper.vm.localNetwork).toBe(true);
        expect(wrapper.html()).toMatchSnapshot();
        done();
    });

    it('Should display locally running networks', async (done) => {
        const wrapper = helper.mountFn(CreateWorkspace, { propsData: { existingWorkspaces: [] }});
        await wrapper.find('#detectServers').trigger('click');
        await wrapper.vm.$nextTick();
        await wrapper.find('#serverDetected-0').trigger('click');

        expect(wrapper.vm.rpcServer).toBe('http://127.0.0.1:8545');
        expect(wrapper.html()).toMatchSnapshot();
        done();
    });

    it('Should not allow multiple workspaces with the same name', async (done) => {
        const wrapper = helper.mountFn(CreateWorkspace, { propsData: { existingWorkspaces: ['Hardhat'] }});

        await wrapper.find('#workspaceName').setValue('Hardhat');
        await wrapper.find('#workspaceServer').setValue('http://127.0.0.1:8545');

        await wrapper.find('#createWorkspace').trigger('click');

        await wrapper.vm.$nextTick();
        expect(wrapper.vm.errorMessage).toBe('A workspace with this name already exists.');
        expect(wrapper.html()).toMatchSnapshot();
        done();
    });

    afterEach(async () => {
        await helper.clearFirebase();
    });    
});

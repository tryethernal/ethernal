import flushPromises from 'flush-promises';
import MockHelper from '../MockHelper';

import CreateWorkspace from '@/components/CreateWorkspace.vue';

beforeEach(() => jest.clearAllMocks());

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

        jest.spyOn(helper.mocks.server, 'initRpcServer').mockResolvedValue(true);
        jest.spyOn(helper.mocks.server, 'createWorkspace').mockResolvedValue(true);

        const wrapper = helper.mountFn(CreateWorkspace, {
            attachTo: document.body
        });

        await wrapper.setData({ name, rpcServer });
        await flushPromises();

        await wrapper.find('#createWorkspace').trigger('click');
        await flushPromises();

        expect(wrapper.emitted().workspaceCreated).toBeTruthy();
        wrapper.destroy();
    });

    it('Should display an error if it cannot connect to the chain', async () => {
        const name = 'Hardhat';
        const rpcServer = 'http://127.0.0.1';

        jest.spyOn(helper.mocks.server, 'initRpcServer').mockRejectedValue(new Error('Error'));

        const wrapper = helper.mountFn(CreateWorkspace, {
            attachTo: document.body
        });

        await wrapper.setData({ name, rpcServer });
        await flushPromises();

        await wrapper.find('#createWorkspace').trigger('click');
        await flushPromises();

        expect(wrapper.emitted().workspaceCreated).toBeFalsy();
        expect(wrapper.html()).toMatchSnapshot();
        wrapper.destroy();
    });

    it('Should display a warning if browser is Safari', () => {
        jest.spyOn(navigator, 'vendor', 'get').mockReturnValue('apple');
        const wrapper = helper.mountFn(CreateWorkspace);

        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should display locally running networks', async () => {
        const wrapper = helper.mountFn(CreateWorkspace);
        await wrapper.find('#detectServers').trigger('click');
        await wrapper.vm.$nextTick();
        await wrapper.find('#serverDetected-0').trigger('click');

        expect(wrapper.vm.rpcServer).toBe('http://127.0.0.1:8545');
        expect(wrapper.html()).toMatchSnapshot();
    });
});

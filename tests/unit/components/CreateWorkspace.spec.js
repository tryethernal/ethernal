import flushPromises from 'flush-promises';

import CreateWorkspace from '@/components/CreateWorkspace.vue';

describe('CreateWorkspace.vue', () => {
    it('Should display a warning message if user has already been onboarded & on a free plan', () => {
        const wrapper = mount(CreateWorkspace, {
            global: {
                plugins: [createTestingPinia({
                    initialState: {
                        user: {
                            plan: 'free',
                            onboarded: true
                        }
                    }
                })]
            }
        });

        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should not display a warning message if user has already been onboarded & on a premium plan', () => {
        const wrapper = mount(CreateWorkspace, {
            global: {
                plugins: [createTestingPinia({
                    initialState: {
                        user: {
                            plan: 'premium',
                            onboarded: true
                        }
                    }
                })]
            }
        });
        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should let the user create a new workspace', async () => {
        const name = 'Hardhat';
        const rpcServer = 'http://127.0.0.1:8545';

        vi.spyOn(server, 'initRpcServer').mockResolvedValueOnce(true);
        vi.spyOn(server, 'createWorkspace').mockResolvedValueOnce(true);

        const wrapper = mount(CreateWorkspace, {
            attachTo: document.body
        });

        await wrapper.setData({ name, rpcServer });
        await flushPromises();

        await wrapper.find('#createWorkspace').trigger('click');
        await flushPromises();

        expect(wrapper.emitted().workspaceCreated).toBeTruthy();
    });

    it('Should display an error if it cannot connect to the chain', async () => {
        const name = 'Hardhat';
        const rpcServer = 'http://127.0.0.1';

        vi.spyOn(server, 'initRpcServer').mockRejectedValueOnce(new Error('Error'));

        const wrapper = mount(CreateWorkspace, {
            attachTo: document.body
        });

        await wrapper.setData({ name, rpcServer });
        await flushPromises();

        await wrapper.find('#createWorkspace').trigger('click');
        await flushPromises();

        expect(wrapper.emitted().workspaceCreated).toBeFalsy();
        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should display a warning if browser is Safari', () => {
        vi.spyOn(navigator, 'vendor', 'get').mockReturnValueOnce('apple');
        const wrapper = mount(CreateWorkspace);

        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should display locally running networks', async () => {
        const wrapper = mount(CreateWorkspace);
        await wrapper.find('#detectServers').trigger('click');
        await wrapper.vm.$nextTick();
        await wrapper.find('#serverDetected-0').trigger('click');

        expect(wrapper.vm.rpcServer).toBe('http://127.0.0.1:8545');
        expect(wrapper.html()).toMatchSnapshot();
    });
});

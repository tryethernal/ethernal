import CreateWorkspace from '@/components/CreateWorkspace.vue';
import flushPromises from 'flush-promises';
import { createTestingPinia } from '@pinia/testing';

const stubs = [];

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
                })],
                stubs
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
                })],
                stubs
            }
        });
        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should let the user create a new workspace', async () => {
        vi.spyOn(server, 'initRpcServer').mockResolvedValueOnce(true);
        vi.spyOn(server, 'createWorkspace').mockResolvedValueOnce({ data: {} });
        const wrapper = mount(CreateWorkspace, {
            attachTo: document.body,
            global: {
                stubs
            }
        });
        wrapper.vm.name = 'Hardhat';
        wrapper.vm.rpcServer = 'http://127.0.0.1:8545';
        await flushPromises();
        await wrapper.find('#createWorkspace').trigger('click');
        await flushPromises();
        expect(wrapper.emitted().workspaceCreated).toBeTruthy();
    });

    it('Should display an error if it cannot connect to the chain', async () => {
        vi.spyOn(server, 'initRpcServer').mockRejectedValueOnce(new Error('Error'));
        const wrapper = mount(CreateWorkspace, {
            attachTo: document.body,
            global: {
                stubs
            }
        });
        wrapper.vm.name = 'Hardhat';
        wrapper.vm.rpcServer = 'http://127.0.0.1';
        await flushPromises();
        await wrapper.find('#createWorkspace').trigger('click');
        await flushPromises();
        expect(wrapper.emitted().workspaceCreated).toBeFalsy();
        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should display a warning if browser is Safari', () => {
        // Mock Safari detection
        window.GestureEvent = function() {};
        const wrapper = mount(CreateWorkspace, {
            global: {
                stubs
            }
        });
        expect(wrapper.html()).toMatchSnapshot();
        delete window.GestureEvent;
    });

    it('Should display locally running networks', async () => {
        vi.spyOn(server, 'searchForLocalChains').mockResolvedValueOnce(['http://127.0.0.1:8545']);
        const wrapper = mount(CreateWorkspace, {
            global: {
                stubs
            }
        });
        await wrapper.find('#detectServers').trigger('click');
        await flushPromises();
        await wrapper.find('#serverDetected-0').trigger('click');
        expect(wrapper.vm.rpcServer).toBe('http://127.0.0.1:8545');
        expect(wrapper.html()).toMatchSnapshot();
    });
});

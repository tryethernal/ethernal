import { h } from "vue";
import { VApp } from "vuetify/components";
import DemoExplorerSetupEmbedded from '@/components/DemoExplorerSetupEmbedded.vue';

describe('DemoExplorerSetupEmbedded.vue', () => {
    it('renders the default form', async () => {
        vi.spyOn(server, 'getCurrentUser').mockResolvedValueOnce({ data: { id: 1 }});
        const wrapper = mount(VApp, {
            slots: {
                default: h(DemoExplorerSetupEmbedded)
            }
        });
        await flushPromises();
        expect(wrapper.html()).toMatchSnapshot();
    });

    it('opens the email modal when Get Started is clicked', async () => {
        vi.spyOn(server, 'getCurrentUser').mockResolvedValueOnce({ data: { id: 1 }});
        const wrapper = mount(VApp, {
            slots: {
                default: h(DemoExplorerSetupEmbedded)
            }
        });
        const embedded = wrapper.findComponent(DemoExplorerSetupEmbedded);
        embedded.vm.openEmailModal();
        await flushPromises();
        expect(wrapper.html()).toMatchSnapshot();
    });

    it('shows the success message after explorer creation', async () => {
        vi.spyOn(server, 'getCurrentUser').mockResolvedValueOnce({ data: { id: 1 }});
        vi.spyOn(server, 'createDemoExplorer').mockResolvedValueOnce();
        const wrapper = mount(VApp, {
            slots: {
                default: h(DemoExplorerSetupEmbedded)
            }
        });
        const embedded = wrapper.findComponent(DemoExplorerSetupEmbedded);
        embedded.vm.openEmailModal();
        await flushPromises();
        // Set valid email and rpcServer to pass validation
        embedded.vm.email = 'test@example.com';
        embedded.vm.emailValid = true;
        embedded.vm.rpcServer = 'https://my.rpc.com:8545';
        // Simulate submit
        await embedded.vm.submit();
        await flushPromises();
        expect(wrapper.html()).toMatchSnapshot();
    });
});

import { h } from "vue";
import { VApp } from "vuetify/components";
import DemoExplorerSetupEmbedded from '@/components/DemoExplorerSetupEmbedded.vue';

describe('DemoExplorerSetupEmbedded.vue', () => {
    it('renders the default RPC form', async () => {
        vi.spyOn(server, 'getCurrentUser').mockResolvedValueOnce({ data: { id: 1 }});
        const wrapper = mount(DemoExplorerSetupEmbedded);
        await flushPromises();
        expect(wrapper.html()).toMatchSnapshot();
    });

    it('shows the email field after submitting RPC', async () => {
        vi.spyOn(server, 'getCurrentUser').mockResolvedValueOnce({ data: { id: 1 }});
        const wrapper = mount(DemoExplorerSetupEmbedded);
        await flushPromises();
        // Set valid RPC and submit
        wrapper.vm.rpcServer = 'https://my.rpc.com:8545';
        wrapper.vm.valid = true;
        await wrapper.find('form').trigger('submit.prevent');
        await flushPromises();
        expect(wrapper.html()).toMatchSnapshot();
    });

    it('shows the success message after explorer creation', async () => {
        vi.spyOn(server, 'getCurrentUser').mockResolvedValueOnce({ data: { id: 1 }});
        vi.spyOn(server, 'createDemoExplorer').mockResolvedValueOnce();
        const wrapper = mount(DemoExplorerSetupEmbedded);
        await flushPromises();
        // Go to email step
        wrapper.vm.rpcServer = 'https://my.rpc.com:8545';
        wrapper.vm.valid = true;
        await wrapper.find('form').trigger('submit.prevent');
        await flushPromises();
        // Set valid email and submit
        wrapper.vm.email = 'test@example.com';
        wrapper.vm.emailValid = true;
        await wrapper.find('form').trigger('submit.prevent');
        await flushPromises();
        expect(wrapper.html()).toMatchSnapshot();
    });
});

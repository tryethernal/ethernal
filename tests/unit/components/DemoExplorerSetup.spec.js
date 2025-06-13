import { h } from 'vue';
import { VApp } from 'vuetify/components';
import DemoExplorerSetup from '@/components/DemoExplorerSetup.vue';

describe('DemoExplorerSetup.vue', () => {
    it('Should display demo explorer setup page', async () => {
        vi.spyOn(server, 'getCurrentUser').mockResolvedValueOnce({ data: { id: 1 }});
        const wrapper = mount(VApp, {
            slots: {
                default: h(DemoExplorerSetup)
            }
        });
        await flushPromises();
        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should display success message after explorer creation', async () => {
        vi.spyOn(server, 'getCurrentUser').mockResolvedValueOnce({ data: { id: 1 }});
        vi.spyOn(server, 'createDemoExplorer').mockResolvedValueOnce();
        const wrapper = mount(VApp, {
            slots: {
                default: h(DemoExplorerSetup)
            }
        });
        await flushPromises();
        // Fill form fields by order
        const inputs = wrapper.findAll('input');
        await inputs[0].setValue('My Explorer'); // Explorer Name
        await inputs[1].setValue('https://my.rpc.com:8545'); // RPC URL
        await inputs[2].setValue('ETH'); // Native Token Symbol (optional)
        await inputs[3].setValue('test@email.com'); // Email
        // Submit form
        await wrapper.find('form').trigger('submit.prevent');
        await flushPromises();
        expect(wrapper.html()).toMatchSnapshot();
    });
});

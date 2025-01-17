import { h } from "vue";
import { VApp } from "vuetify/components";
import DemoExplorerSetup from '@/components/DemoExplorerSetup.vue';

describe('DemoExplorerSetup.vue', () => {
    it('Should display demo explorer setup page', async () => {
        vi.spyOn(server, 'getCurrentUser').mockResolvedValue({ data: { id: 1 }});
        const wrapper = mount(VApp, {
            slots: {
                default: h(DemoExplorerSetup)
            }
        });

        expect(wrapper.html()).toMatchSnapshot();
    });
});

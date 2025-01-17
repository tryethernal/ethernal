
import { h } from "vue";
import { VApp } from "vuetify/components";
import DemoExplorerSetupEmbedded from '@/components/DemoExplorerSetupEmbedded.vue';

describe('DemoExplorerSetupEmbedded.vue', () => {
    it('Should display embeddable setup', async () => {
        vi.spyOn(server, 'getCurrentUser').mockResolvedValue({ data: { id: 1 }});
        const wrapper = mount(VApp, {
            slots: {
                default: h(DemoExplorerSetupEmbedded)
            }
        });

        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should display success message with domain', async () => {
        vi.spyOn(server, 'getCurrentUser').mockResolvedValue({ data: { id: 1 }});
        const wrapper = mount(VApp, {
            slots: {
                default: h(DemoExplorerSetupEmbedded, {
                    domain: 'my.explorer.com'
                })
            }
        });

        expect(wrapper.html()).toMatchSnapshot();
    });
});

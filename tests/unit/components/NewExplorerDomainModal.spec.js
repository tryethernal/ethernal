import flushPromises from 'flush-promises';

import NewExplorerDomainModal from '@/components/NewExplorerDomainModal.vue';

describe('NewExplorerDomainModal.vue', () => {
    it('Should display dns setup info', async () => {
        const wrapper = mount(NewExplorerDomainModal, {
            data() {
                return {
                    dialog: true,
                    resolve: vi.fn().mockResolvedValue(),
                    domain: 'explorer.protocol.com'
                }
            }
        });
        await flushPromises();

        expect(wrapper.html()).toMatchSnapshot();
    });

});

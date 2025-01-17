import flushPromises from 'flush-promises';

import ExplorerDomainDNSInfoModal from '@/components/ExplorerDomainDNSInfoModal.vue';

describe('ExplorerDomainDNSInfoModal.vue', () => {
    it('Should display DNS info', async () => {
        const wrapper = mount(ExplorerDomainDNSInfoModal, {
            data() {
                return {
                    dialog: true,
                    resolve: vi.fn().mockResolvedValue(),
                    domain: 'ethernal.com',
                    dnsStatus: {
                        apx_hit: true,
                        dns_pointed_at: '37.16.1.34',
                        last_monitored_humanized: '1 minute ago',
                        is_resolving: true,
                        has_ssl: false
                    }
                };
            }
        });
        await flushPromises();

        expect(wrapper.html()).toMatchSnapshot();
    });
});

import flushPromises from 'flush-promises';
import MockHelper from '../MockHelper';

import ExplorerDomainDNSInfoModal from '@/components/ExplorerDomainDNSInfoModal.vue';

let helper;
beforeEach(() => {
    jest.clearAllMocks()
    helper = new MockHelper();
});

describe('ExplorerDomainDNSInfoModal.vue', () => {
    it('Should display DNS info', async () => {
        const wrapper = helper.mountFn(ExplorerDomainDNSInfoModal, {
            data() {
                return {
                    dialog: true,
                    resolve: jest.fn().mockResolvedValue(),
                    domain: 'ethernal.com',
                    dnsStatus: {
                        apx_hit: true,
                        dns_pointed_at: '75.2.60.5',
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

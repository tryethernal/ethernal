import flushPromises from 'flush-promises';
import MockHelper from '../MockHelper';

import ExplorerDomain from '@/components/ExplorerDomain.vue';

let helper;
beforeEach(() => {
    jest.clearAllMocks()
    helper = new MockHelper();
});

describe('ExplorerDomain.vue', () => {
    it('Should display DNS status', async () => {
        jest.spyOn(helper.mocks.server, 'getExplorerDomainStatus').mockResolvedValue({ data: { status_message: 'ok', status: 'ACTIVE_SSL' }});
        const wrapper = helper.mountFn(ExplorerDomain, {
            stubs: ['Explorer-Domain-DNS-Info-Modal'],
            propsData: {
                domain: {
                    id: 1,
                    domain: 'ethernal.com'
                }
            }
        });
        await flushPromises();

        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should display N/A message', async () => {
        jest.spyOn(helper.mocks.server, 'getExplorerDomainStatus').mockResolvedValue({ data: null });
        const wrapper = helper.mountFn(ExplorerDomain, {
            stubs: ['Explorer-Domain-DNS-Info-Modal'],
            propsData: {
                domain: {
                    id: 1,
                    domain: 'ethernal.com'
                }
            }
        });
        await flushPromises();

        expect(wrapper.html()).toMatchSnapshot();
    });
});

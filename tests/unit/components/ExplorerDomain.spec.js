import flushPromises from 'flush-promises';

import ExplorerDomain from '@/components/ExplorerDomain.vue';

vi.mock('@/stores/env', () => ({
    useEnvStore: () => ({
        isSelfHosted: false
    })
}));

describe('ExplorerDomain.vue', () => {
    it('Should display DNS status', async () => {
        vi.spyOn(server, 'getExplorerDomainStatus').mockResolvedValue({ data: { status_message: 'ok', status: 'ACTIVE_SSL' }});
        const wrapper = mount(ExplorerDomain, {
            global: {
                stubs: ['Explorer-Domain-DNS-Info-Modal'],
            },
            props: {
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
        vi.spyOn(server, 'getExplorerDomainStatus').mockResolvedValue({ data: {}});
        const wrapper = mount(ExplorerDomain, {
            global: {
                stubs: ['Explorer-Domain-DNS-Info-Modal'],
            },
            props: {
                domain: {
                    id: 1,
                    domain: 'ethernal.com'
                }
            }
        });
        await flushPromises();

        expect(wrapper.html()).toMatchSnapshot();
    });

    describe('Self-hosted setup', () => {
        beforeEach(() => {
            vi.doMock('@/stores/env', () => ({
                useEnvStore: () => ({
                    isSelfHosted: true
                })
            }));
        });
        afterEach(() => {
            vi.resetModules();
        });

        it('Should not display DNS status or refresh button', async () => {
            vi.spyOn(server, 'getExplorerDomainStatus').mockResolvedValue({ data: { status_message: 'ok', status: 'ACTIVE_SSL' }});
            const wrapper = mount(ExplorerDomain, {
                global: {
                    stubs: ['Explorer-Domain-DNS-Info-Modal'],
                },
                props: {
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
});

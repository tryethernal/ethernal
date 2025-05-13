import flushPromises from 'flush-promises';

import Explorer from '@/components/ExplorerGeneral.vue';

describe('ExplorerGeneral.vue', () => {
    it('Should display inactive subscription message', async() => {
        vi.spyOn(server, 'getWorkspaces').mockResolvedValueOnce({ data: [{ id: 1 }]});
        vi.spyOn(server, 'getExplorer').mockResolvedValueOnce({ data: { id: 1, slug: 'test', domains: [] }});
        const wrapper = mount(Explorer, {
            global: {
                stubs: ['Explorer-Settings', 'Explorer-Billing', 'Explorer-Domains-List', 'Explorer-Branding', 'Explorer-Danger-Zone', 'Explorer-Sync'],
                plugins: [createTestingPinia({
                    initialState: {
                        env: { mainDomain: 'ethernal.local:8080' }
                    }
                })]
            }
        });
        await flushPromises();

        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should display trial message', async() => {
        vi.spyOn(server, 'getWorkspaces').mockResolvedValueOnce({ data: [{ id: 1 }]});
        vi.spyOn(server, 'getExplorer').mockResolvedValueOnce({ data: { id: 1, slug: 'test', domains: [], stripeSubscription: { isTrialing: true, stripePlan: { capabilities: {}}}}});
        const wrapper = mount(Explorer, {
            global: {
                stubs: ['Explorer-Settings', 'Explorer-Billing', 'Explorer-Domains-List', 'Explorer-Branding', 'Explorer-Danger-Zone', 'Explorer-Sync'],
                plugins: [createTestingPinia({
                    initialState: {
                        env: { mainDomain: 'ethernal.local:8080' }
                    }
                })]
            }
        });
        await flushPromises();

        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should display the explorer page', async () => {
        vi.spyOn(server, 'getWorkspaces').mockResolvedValueOnce({ data: [{ id: 1 }]});
        vi.spyOn(server, 'getExplorer').mockResolvedValueOnce({ data: { id: 1, slug: 'test', domains: [{ domain: 'a.test.com' }], stripeSubscription: { stripePlan: { capabilities: {}}}}});
        const wrapper = mount(Explorer, {
            global: {
                stubs: ['Explorer-Settings', 'Explorer-Billing', 'Explorer-Domains-List', 'Explorer-Branding', 'Explorer-Danger-Zone', 'Explorer-Sync']
            }
        });
        await flushPromises();

        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should display loading', async () => {
        vi.spyOn(server, 'getWorkspaces').mockResolvedValueOnce({ data: [{ id: 1 }]});
        vi.spyOn(server, 'getExplorer').mockResolvedValueOnce({ data: { id: 1, domains: []}});
        const wrapper = mount(Explorer, {
            global: {
                stubs: ['Explorer-Settings', 'Explorer-Billing', 'Explorer-Domains-List', 'Explorer-Branding', 'Explorer-Danger-Zone', 'Explorer-Sync'],
                mocks: {
                    $route: { query: { status: 'success' }}
                }
            }
        });

        await flushPromises();

        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should not display danger zone if SSO', async () => {
        vi.spyOn(server, 'getWorkspaces').mockResolvedValueOnce({ data: [{ id: 1 }]});
        vi.spyOn(server, 'getExplorer').mockResolvedValueOnce({ data: { id: 1, slug: 'test', domains: [{ domain: 'a.test.com' }], stripeSubscription: { stripePlan: { capabilities: {}}}}});
        const wrapper = mount(Explorer, {
            props: {
                sso: true
            },
            global: {
                stubs: ['Explorer-Settings', 'Explorer-Billing', 'Explorer-Domains-List', 'Explorer-Branding', 'Explorer-Danger-Zone', 'Explorer-Sync']
            }
        });
        await flushPromises();

        expect(wrapper.html()).toMatchSnapshot();
    });
});

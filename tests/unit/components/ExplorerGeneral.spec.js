import Explorer from '@/components/ExplorerGeneral.vue';
import { createRouter, createWebHistory } from 'vue-router';
import { createTestingPinia } from '@pinia/testing';

function getRouterWithQuery(query = {}) {
    const router = createRouter({
        history: createWebHistory(),
        routes: [{ path: '/', component: { template: '<div></div>' } }]
    });
    // Push initial route with query if needed
    router.push({ path: '/', query });
    return router;
}

const mockWorkspace = { name: 'Test Workspace', rpcServer: 'http://localhost:8545', networkId: 1 };

describe('ExplorerGeneral.vue', () => {
    it('Should display inactive subscription message', async() => {
        server.getWorkspaces.mockResolvedValueOnce({ data: [{ id: 1 }]});
        server.getExplorer.mockResolvedValueOnce({ data: { id: 1, slug: 'test', domains: [], workspace: mockWorkspace }});
        const router = getRouterWithQuery();
        await router.isReady();
        const wrapper = mount(Explorer, {
            global: {
                stubs: ['Explorer-Settings', 'Explorer-Billing', 'Explorer-Domains-List', 'Explorer-Branding', 'Explorer-Danger-Zone', 'Explorer-Sync'],
                plugins: [router, createTestingPinia()]
            },
            props: {
                id: 1
            }
        });
        await flushPromises();
        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should display trial message', async() => {
        server.getWorkspaces.mockResolvedValueOnce({ data: [{ id: 1 }]});
        server.getExplorer.mockResolvedValueOnce({ data: { id: 1, slug: 'test', domains: [], workspace: mockWorkspace, stripeSubscription: { isTrialing: true, stripePlan: { capabilities: {}}}}});
        const router = getRouterWithQuery();
        await router.isReady();
        const wrapper = mount(Explorer, {
            global: {
                stubs: ['Explorer-Settings', 'Explorer-Billing', 'Explorer-Domains-List', 'Explorer-Branding', 'Explorer-Danger-Zone', 'Explorer-Sync'],
                plugins: [router, createTestingPinia()]
            },
            props: {
                id: 1
            }
        });
        await flushPromises();
        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should display the explorer page', async () => {
        server.getWorkspaces.mockResolvedValueOnce({ data: [{ id: 1 }]});
        server.getExplorer.mockResolvedValueOnce({ data: { id: 1, slug: 'test', domains: [{ domain: 'a.test.com' }], workspace: mockWorkspace, stripeSubscription: { stripePlan: { capabilities: {}}}}});
        const router = getRouterWithQuery();
        await router.isReady();
        const wrapper = mount(Explorer, {
            global: {
                stubs: ['Explorer-Settings', 'Explorer-Billing', 'Explorer-Domains-List', 'Explorer-Branding', 'Explorer-Danger-Zone', 'Explorer-Sync'],
                plugins: [router, createTestingPinia()]
            },
            props: {
                id: 1
            }
        });
        await flushPromises();
        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should display loading', async () => {
        server.getWorkspaces.mockResolvedValueOnce({ data: [{ id: 1 }]});
        server.getExplorer.mockResolvedValueOnce({ data: { id: 1, domains: [], workspace: mockWorkspace }});
        const router = getRouterWithQuery({ status: 'success' });
        await router.isReady();
        const wrapper = mount(Explorer, {
            global: {
                stubs: ['Explorer-Settings', 'Explorer-Billing', 'Explorer-Domains-List', 'Explorer-Branding', 'Explorer-Danger-Zone', 'Explorer-Sync'],
                plugins: [router, createTestingPinia()]
            },
            props: {
                id: 1
            }
        });
        await flushPromises();
        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should not display danger zone if SSO', async () => {
        server.getWorkspaces.mockResolvedValueOnce({ data: [{ id: 1 }]});
        server.getExplorer.mockResolvedValueOnce({ data: { id: 1, slug: 'test', domains: [{ domain: 'a.test.com' }], workspace: mockWorkspace, stripeSubscription: { stripePlan: { capabilities: {}}}}});
        const router = getRouterWithQuery();
        await router.isReady();
        const wrapper = mount(Explorer, {
            global: {
                stubs: ['Explorer-Settings', 'Explorer-Billing', 'Explorer-Domains-List', 'Explorer-Branding', 'Explorer-Danger-Zone', 'Explorer-Sync'],
                plugins: [router, createTestingPinia()]
            },
            props: {
                id: 1,
                sso: true
            }
        });
        await flushPromises();
        expect(wrapper.html()).toMatchSnapshot();
    });
});

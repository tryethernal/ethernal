import flushPromises from 'flush-promises';
import MockHelper from '../MockHelper';

import Explorer from '@/components/Explorer.vue';

beforeEach(() => jest.clearAllMocks());

describe('Explorer.vue', () => {
    let helper;

    beforeEach(() => {
        helper = new MockHelper();
    });

    it('Should display the explorer page', async () => {
        jest.spyOn(helper.mocks.server, 'getWorkspaces').mockResolvedValueOnce({ data: [{ id: 1 }]});
        jest.spyOn(helper.mocks.server, 'getExplorer').mockResolvedValueOnce({ data: { id: 1, stripeSubscription: { stripePlan: { capabilities: {}}}}});
        const wrapper = helper.mountFn(Explorer, {
            stubs: ['Explorer-Settings', 'Explorer-Billing', 'Explorer-Domains-List', 'Explorer-Branding', 'Explorer-Danger-Zone']
        });
        await flushPromises();

        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should display loading', async () => {
        jest.spyOn(helper.mocks.server, 'getWorkspaces').mockResolvedValueOnce({ data: [{ id: 1 }]});
        jest.spyOn(helper.mocks.server, 'getExplorer').mockResolvedValueOnce({ data: { id: 1 }});
        const wrapper = helper.mountFn(Explorer, {
            stubs: ['Explorer-Settings', 'Explorer-Billing', 'Explorer-Domains-List', 'Explorer-Branding', 'Explorer-Danger-Zone'],
            computed: {
                justCreated() { return true }
            }
        });

        await flushPromises();

        expect(wrapper.html()).toMatchSnapshot();
    });
});

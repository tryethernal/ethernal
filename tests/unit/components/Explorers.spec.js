import flushPromises from 'flush-promises';
import MockHelper from '../MockHelper';

import Explorers from '@/components/Explorers.vue';

let helper;
beforeEach(() => {
    jest.clearAllMocks()
    helper = new MockHelper();
});

describe('Explorers.vue', () => {
    it('Should display public explorer explainer when no explorers', async () => {
        jest.spyOn(helper.mocks.server, 'getExplorers').mockResolvedValueOnce({ data: { items: [] }});
        const wrapper = helper.mountFn(Explorers, {
            stubs: ['Create-Explorer-Modal']
        });
        await flushPromises();

        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should display settings with all options', async () => {
        jest.spyOn(helper.mocks.server, 'getExplorers').mockResolvedValueOnce({
            data: {
                items: [
                    { id: 1, name: 'Explorer 1', domains: [{ domain: 'explorer1.com' }], workspace: { name: 'Workspace 1' }, rpcServer: 'rpc 1', stripeSubscription: { isActive: true }},
                    { id: 2, slug: 'test', name: 'Explorer 2', domains: [], workspace: { name: 'Workspace 2' }, rpcServer: 'rpc 2', stripeSubscription: { isPendingCancelation: true }},
                    { id: 3, name: 'Explorer 3', domains: [{ domain: 'a.explorer1.com' }, { domain: 'b.explorer1.com' }], workspace: { name: 'Workspace 3' }, rpcServer: 'rpc 3' },
                ]
            }
        });
        const wrapper = helper.mountFn(Explorers, {
            stubs: ['Create-Explorer-Modal']
        });
        await flushPromises();

        expect(wrapper.html()).toMatchSnapshot();
    });

});

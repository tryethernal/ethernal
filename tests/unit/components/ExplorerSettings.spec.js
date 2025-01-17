import flushPromises from 'flush-promises';

import ExplorerSettings from '@/components/ExplorerSettings.vue';

const explorer = {
    workspaceId: 1,
    name: 'Explorer',
    slug: 'explorer',
    token: 'ETL',
    stripeSubscription: {
        stripePlan: {
            capabilities: { nativeToken: true, totalSupply: true, l1Explorer: true }
        }
    }
};
const workspaces = [{ id: 1, name: 'Workspace 1', rpcServer: 'rpc', networkId: 1 }, { id: 2, name: 'Workspace 2', rpcServer: 'rpc', networkId: 1 }];

describe('ExplorerSettings.vue', () => {
    it('Should display settings with all options', async () => {
        const wrapper = mount(ExplorerSettings, {
            props: { explorer, workspaces }
        });
        await flushPromises();

        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should display settings with deactivated options', async () => {
        const wrapper = mount(ExplorerSettings, {
            props: {
                explorer: { ...explorer, stripeSubscription: { stripePlan: { capabilities: { nativeToken: false, totalSupply: false }}}},
                workspaces
            }
        });
        await flushPromises();

        expect(wrapper.html()).toMatchSnapshot();
    });
});

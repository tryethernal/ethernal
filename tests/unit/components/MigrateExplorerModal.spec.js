import flushPromises from 'flush-promises';
import MockHelper from '../MockHelper';

import MigrateExplorerModal from '@/components/MigrateExplorerModal.vue';

let helper;
beforeEach(() => {
    jest.clearAllMocks()
    helper = new MockHelper();
});

describe('MigrateExplorerModal.vue', () => {
    it('Should display pricing options', async () => {
        jest.spyOn(helper.mocks.server, 'getExplorerPlans').mockResolvedValueOnce({
            data: [
                { price: 10, slug: 'a' },
                { price: 20, slug: 'b' }
            ]
        });
        const wrapper = helper.mountFn(MigrateExplorerModal, {
            stubs: ['Explorer-Plan-Card']
        });
        wrapper.vm.open({
            explorerToken: 'ether',
            explorer: {
                id: 1,
                name: 'explorer',
                rpcServer: 'explorer.rpc'
            }
        });

        await flushPromises();
        expect(wrapper.html()).toMatchSnapshot();
    });
});

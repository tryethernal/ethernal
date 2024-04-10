import flushPromises from 'flush-promises';
import MockHelper from '../MockHelper';

import ExplorerQuotaManagementModal from '@/components/ExplorerQuotaManagementModal.vue';

let helper;
beforeEach(() => {
    jest.clearAllMocks()
    helper = new MockHelper();
});

describe('ExplorerQuotaManagementModal.vue', () => {
    it('Should display dns setup info', async () => {
        const wrapper = helper.mountFn(ExplorerQuotaManagementModal, {
            data() {
                return {
                    dialog: true,
                    resolve: jest.fn().mockResolvedValue(),
                    domain: 'explorer.protocol.com'
                }
            }
        });
        await flushPromises();

        expect(wrapper.html()).toMatchSnapshot();
    });

});

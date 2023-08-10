import flushPromises from 'flush-promises';
import MockHelper from '../MockHelper';

import NewExplorerDomainModal from '@/components/NewExplorerDomainModal.vue';

let helper;
beforeEach(() => {
    jest.clearAllMocks()
    helper = new MockHelper();
});

describe('NewExplorerDomainModal.vue', () => {
    it('Should display dns setup info', async () => {
        const wrapper = helper.mountFn(NewExplorerDomainModal, {
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

import flushPromises from 'flush-promises';
import MockHelper from '../MockHelper';

import ExplorerDexParametersModal from '@/components/ExplorerDexParametersModal.vue';

let helper;
beforeEach(() => {
    jest.clearAllMocks()
    helper = new MockHelper();
});

describe('ExplorerDexParametersModal.vue', () => {
    it('Should display dex parameters', async () => {
        const wrapper = helper.mountFn(ExplorerDexParametersModal, {
            data() {
                return {
                    dialog: true,
                    resolve: jest.fn().mockResolvedValue(),
                    transactionTimeout: 20 * 60 * 60,
                    slippageToleranceInBps: 0.5 * 100
                };
            }
        });
        await flushPromises();

        expect(wrapper.html()).toMatchSnapshot();
    });
});

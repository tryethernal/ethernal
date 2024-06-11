import flushPromises from 'flush-promises';
import MockHelper from '../MockHelper';

import ExplorerFaucetPrivateKeyExportModal from '@/components/ExplorerFaucetPrivateKeyExportModal.vue';

beforeEach(() => jest.clearAllMocks());

describe('ExplorerFaucetPrivateKeyExportModal.vue', () => {
    let helper;

    beforeEach(() => {
        helper = new MockHelper();
    });

    it('Should display private key', async () => {
        jest.spyOn(helper.mocks.server, 'getFaucetPrivateKey').mockResolvedValue({ data: { privateKey: '0x123' }});

        const wrapper = helper.mountFn(ExplorerFaucetPrivateKeyExportModal);
        wrapper.vm.open({ faucetId: 1 });
        await flushPromises();

        expect(wrapper.html()).toMatchSnapshot();
    });
});

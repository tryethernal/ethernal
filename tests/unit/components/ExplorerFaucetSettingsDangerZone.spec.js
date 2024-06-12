import flushPromises from 'flush-promises';
import MockHelper from '../MockHelper';

import ExplorerFaucetSettingsDangerZone from '@/components/ExplorerFaucetSettingsDangerZone.vue';

beforeEach(() => jest.clearAllMocks());

describe('ExplorerFaucetSettingsDangerZone.vue', () => {
    let helper;
    const stubs = ['Explorer-Faucet-Private-Key-Export-Modal'];

    beforeEach(() => {
        helper = new MockHelper();
    });

    it('Should display danger zone', async () => {
        const wrapper = helper.mountFn(ExplorerFaucetSettingsDangerZone, { stubs });
        await flushPromises();

        expect(wrapper.html()).toMatchSnapshot();
    });
});

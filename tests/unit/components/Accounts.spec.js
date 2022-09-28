import MockHelper from '../MockHelper';
import flushPromises from 'flush-promises'

import Accounts from '@/components/Accounts.vue';

const helper = new MockHelper();

describe('Accounts.vue', () => {
    beforeEach(() => jest.clearAllMocks());

    it('Should load stored accounts & sync balances', async () => {
        jest.spyOn(helper.mocks.server, 'getAccounts')
            .mockResolvedValue({ data: { total: 1, items: [{ address: '0x123', balance: '1000' }]}});
        
        const wrapper = helper.mountFn(Accounts, { stubs: ['Hash-Link'] });
        await flushPromises();
        
        expect(wrapper.html()).toMatchSnapshot();
    });
});

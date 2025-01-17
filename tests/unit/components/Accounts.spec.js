import flushPromises from 'flush-promises'

import Accounts from '@/components/Accounts.vue';

describe('Accounts.vue', () => {
    it('Should load stored accounts', async () => {
        vi.spyOn(server, 'getAccounts')
            .mockResolvedValue({ data: { total: 1, items: [{ address: '0x123' }]}});
        vi.spyOn(server, 'getAccountBalance')
            .mockResolvedValue('1000');

        const wrapper = mount(Accounts, {
            global: {
                stubs: ['Hash-Link'],
                plugins: [createTestingPinia()],
            }
        });
        await flushPromises();

        expect(wrapper.html()).toMatchSnapshot();
    });
});

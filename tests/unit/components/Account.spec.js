import flushPromises from 'flush-promises'

import Account from '@/components/Account.vue';

describe('Account.vue', () => {
    it('Should load the account tab', async () => {
        const wrapper = mount(Account, {
            global: {
                plugins: [createTestingPinia({ initialState: { user: { apiToken: '1234' } } })]
            }
        });
        await flushPromises();

        expect(wrapper.html()).toMatchSnapshot();
    });
});

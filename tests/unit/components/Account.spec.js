import MockHelper from '../MockHelper';
import flushPromises from 'flush-promises'

import Account from '@/components/Account.vue';

const helper = new MockHelper();

describe('Account.vue', () => {
    beforeEach(() => jest.clearAllMocks());

    it('Should load the account tab', async () => {
        jest.spyOn(helper.mocks.server, 'getApiToken')
            .mockResolvedValue({ data: { apiToken: '1234'}});

        const wrapper = helper.mountFn(Account);
        await flushPromises();

        expect(wrapper.html()).toMatchSnapshot();
    });
});

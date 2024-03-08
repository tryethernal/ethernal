import flushPromises from 'flush-promises';
import MockHelper from './MockHelper';

import SSO from '@/SSO.vue';

describe('SSO.vue', () => {
    let helper;

    beforeEach(async () => {
        helper = new MockHelper({}, false);
    });

    it('Should show a link', async () => {
        jest.spyOn(helper.mocks.server, 'getCurrentUser')
            .mockResolvedValue({ data: { user: { id: 1 }}});
        const wrapper = helper.mountFn(SSO, {
            mocks: {
                $route: { query: { explorerId: 1 }},
            },
            stubs: ['Explorer']
        });
        await flushPromises();

        expect(wrapper.html()).toMatchSnapshot();
    });
});

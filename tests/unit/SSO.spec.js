import flushPromises from 'flush-promises';

import SSO from '@/SSO.vue';

describe('SSO.vue', () => {
    it('Should show a link', async () => {
        vi.spyOn(server, 'getCurrentUser')
            .mockResolvedValue({ data: { user: { id: 1 }}});

        const wrapper = mount(SSO, {
            global: {
                mocks: {
                    $route: { query: { explorerId: 1 }},
                },
                stubs: ['Explorer']
            }
        });
        await flushPromises();

        expect(wrapper.html()).toMatchSnapshot();
    });
});

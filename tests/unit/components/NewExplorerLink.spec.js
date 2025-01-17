import flushPromises from 'flush-promises';

import NewExplorerLink from '@/components/NewExplorerLink.vue';

describe('NewExplorerLink.vue', () => {
    it('Should display a new link form', async () => {
        const wrapper = mount(NewExplorerLink, {
            global: {
                stubs: ['v-autocomplete']
            }
        });
        await flushPromises();

        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should display an existing link form', async () => {
        vi.spyOn(server, 'searchIcon').mockResolvedValueOnce({ data: { name: 'twitter' }});
        const wrapper = mount(NewExplorerLink, {
            props: {
                url: 'http://twitter.com',
                name: 'twitter',
                icon: 'mdi-twitter',
                uid: 1234
            },
            global: {
                stubs: ['v-autocomplete']
            }
        });
        await flushPromises();

        expect(wrapper.html()).toMatchSnapshot();
    });
});

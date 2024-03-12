import flushPromises from 'flush-promises';
import MockHelper from '../MockHelper';

import NewExplorerLink from '@/components/NewExplorerLink.vue';

let helper;
beforeEach(() => {
    jest.clearAllMocks()
    helper = new MockHelper();
});

describe('NewExplorerLink.vue', () => {
    it('Should display a new link form', async () => {
        const wrapper = helper.mountFn(NewExplorerLink, {
            stubs: ['v-autocomplete']
        });
        await flushPromises();

        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should display an existing link form', async () => {
        jest.spyOn(helper.mocks.server, 'searchIcon').mockResolvedValueOnce({ data: { name: 'twitter' }});
        const wrapper = helper.mountFn(NewExplorerLink, {
            propsData: {
                url: 'http://twitter.com',
                name: 'twitter',
                icon: 'mdi-twitter',
                uid: 1234
            },
            stubs: ['v-autocomplete']
        });
        await flushPromises();

        expect(wrapper.html()).toMatchSnapshot();
    });
});

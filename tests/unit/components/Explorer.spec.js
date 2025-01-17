import flushPromises from 'flush-promises';

import Explorer from '@/components/Explorer.vue';

describe('Explorer.vue', () => {
    it('Should display explorer sections', async() => {
        const wrapper = mount(Explorer, {
            global: {
                stubs: ['Explorer-General', 'Explorer-Faucet-Settings'],
                mocks: {
                    $route: {
                        query: {
                            tab: 'general'
                        }
                    }
                }
            },
            props: {
                id: 1
            }
        });
        await flushPromises();

        expect(wrapper.html()).toMatchSnapshot();
    });
});

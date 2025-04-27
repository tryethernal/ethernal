import flushPromises from 'flush-promises';

vi.mock('vue-router', () => ({
    useRouter: vi.fn(),
    useRoute: vi.fn(() => ({ query: { tab: 'general' } }))
}));

import Explorer from '@/components/Explorer.vue';

describe('Explorer.vue', () => {
    it('Should display explorer sections', async() => {
        const wrapper = mount(Explorer, {
            global: {
                stubs: ['Explorer-General', 'Explorer-Faucet-Settings']
            },
            props: {
                id: 1
            }
        });
        await flushPromises();

        expect(wrapper.html()).toMatchSnapshot();
    });
});

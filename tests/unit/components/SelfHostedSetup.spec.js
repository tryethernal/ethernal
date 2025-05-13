import SelfHostedSetup from '@/components/SelfHostedSetup.vue';

const stubs = ['SelfHostedSetupUser', 'SelfHostedSetupExplorer', 'SelfHostedSetupDone'];

describe('SelfHostedSetup.vue', () => {
    it('renders the initial user step', async () => {
        const wrapper = mount(SelfHostedSetup, {
            global: {
                stubs
            }
        });
        expect(wrapper.html()).toMatchSnapshot();
    });

    it('moves to explorer step on user-created', async () => {
        const wrapper = mount(SelfHostedSetup, {
            global: {
                stubs
            }
        });
        // Simulate user-created event
        await wrapper.findComponent({ name: 'SelfHostedSetupUser' }).vm.$emit('user-created');
        await flushPromises();
        expect(wrapper.html()).toMatchSnapshot();
    });

    it('moves to done step on explorer-created', async () => {
        const wrapper = mount(SelfHostedSetup, {
            global: {
                stubs
            }
        });
        // Simulate user-created event
        await wrapper.findComponent({ name: 'SelfHostedSetupUser' }).vm.$emit('user-created');
        await flushPromises();
        // Simulate explorer-created event
        await wrapper.findComponent({ name: 'SelfHostedSetupExplorer' }).vm.$emit('explorer-created', { id: 42, slug: 'slug' });
        await flushPromises();
        expect(wrapper.html()).toMatchSnapshot();
    });
}); 
import SelfHostedSetupDone from '@/components/SelfHostedSetupDone.vue';

const stubs = [];

describe('SelfHostedSetupDone.vue', () => {
    it('shows explorer domain if present', async () => {
        const wrapper = mount(SelfHostedSetupDone, {
            props: {
                explorer: { id: 1, domains: [{ domain: 'myexplorer.com' }] }
            },
            global: {
                stubs
            }
        });
        expect(wrapper.html()).toMatchSnapshot();
    });

    it('shows slug-based url if no domain', async () => {
        const wrapper = mount(SelfHostedSetupDone, {
            props: {
                explorer: { id: 2, slug: 'slug' }
            },
            global: {
                stubs
            }
        });
        expect(wrapper.html()).toMatchSnapshot();
    });
});

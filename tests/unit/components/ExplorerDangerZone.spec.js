import flushPromises from 'flush-promises';

import ExplorerDangerZone from '@/components/ExplorerDangerZone.vue';

describe('ExplorerDangerZone.vue', () => {
    it('Should display a warning message and an active delete button if pending cancelation', async () => {
        const wrapper = mount(ExplorerDangerZone, {
            global: {
                stubs: ['Delete-Explorer-Modal'],
            },
            props: {
                explorer: {
                    id: 1,
                    stripeSubscription: { status: 'pending_cancelation' }
                }
            }
        });
        await flushPromises();

        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should have an inactive button if active subscription', async () => {
        const wrapper = mount(ExplorerDangerZone, {
            global: {
                stubs: ['Delete-Explorer-Modal'],
            },
            props: {
                explorer: {
                    id: 1,
                    stripeSubscription: { status: 'active' }
                }
            }
        });
        await flushPromises();

        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should have an active button if active subscription & self-hosted', async () => {
        const wrapper = mount(ExplorerDangerZone, {
            global: {
                stubs: ['Delete-Explorer-Modal'],
                plugins: [createTestingPinia({ initialState: { env: { isSelfHosted: true } } })]
            },
            props: {
                explorer: {
                    id: 1,
                    stripeSubscription: { status: 'active' }
                }
            }
        });
        await flushPromises();

        expect(wrapper.html()).toMatchSnapshot();
    });
});

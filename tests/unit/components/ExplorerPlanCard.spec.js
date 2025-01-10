import flushPromises from 'flush-promises';

import ExplorerPlanCard from '@/components/ExplorerPlanCard.vue';

const plan = {
    name: 'Explorer',
    slug: 'explo',
    price: 1000,
    capabilities: {
        txLimit: 1000,
        dataRetention: 7,
        customDomain: true,
        nativeToken: false,
        totalSupply: false,
        statusPage: false,
        branding: true,
        customFields: false,
        description: 'This is a plan'
    }
};

describe('ExplorerPlanCard.vue', () => {
    it('Should display card with trial button', async () => {
        const wrapper = mount(ExplorerPlanCard, {
            global: {
                stubs: ['Explorer-Plan-Card'],
            },
            props: {
                plan,
                trial: true
            }
        });
        await flushPromises();

        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should display regular plan card', async () => {
        const wrapper = mount(ExplorerPlanCard, {
            global: {
                stubs: ['Explorer-Plan-Card'],
            },
            props: {
                plan,
            }
        });
        await flushPromises();

        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should display current plan card', async () => {
        const wrapper = mount(ExplorerPlanCard, {
            global: {
                stubs: ['Explorer-Plan-Card'],
            },
            props: {
                plan,
                current: true
            }
        });
        await flushPromises();

        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should display loading plan card', async () => {
        const wrapper = mount(ExplorerPlanCard, {
            global: {
                stubs: ['Explorer-Plan-Card'],
            },
            props: {
                plan,
                loading: true
            }
        });
        await flushPromises();

        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should display disabled plan card', async () => {
        const wrapper = mount(ExplorerPlanCard, {
            global: {
                stubs: ['Explorer-Plan-Card'],
            },
            props: {
                plan,
                disabled: true
            }
        });
        await flushPromises();

        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should display pending cancelation plan card', async () => {
        const wrapper = mount(ExplorerPlanCard, {
            global: {
                stubs: ['Explorer-Plan-Card'],
            },
            props: {
                plan,
                current: true,
                pendingCancelation: true
            }
        });
        await flushPromises();

        expect(wrapper.html()).toMatchSnapshot();
    });
});

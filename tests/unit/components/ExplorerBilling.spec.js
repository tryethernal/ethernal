import flushPromises from 'flush-promises';

import ExplorerBilling from '@/components/ExplorerBilling.vue';

describe('ExplorerBilling.vue', () => {
    it('Should display trial without card message', async () => {
        const wrapper = mount(ExplorerBilling, {
            global: {
                stubs: ['Update-Explorer-Plan-Modal', 'Explorer-Quota-Management-Modal'],
            },
            props: {
                explorer: {
                    stripeSubscription: {
                        transactionQuota: 10,
                        status: 'trial',
                        cycleEndsAt: new Date(2023, 7, 28),
                        stripePlan: { name: 'Explorer 500', capabilities: { txLimit: 20 }}
                    }
                }
            }
        });
        await flushPromises();

        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should display explorer billing status', async () => {
        const wrapper = mount(ExplorerBilling, {
            global: {
                stubs: ['Update-Explorer-Plan-Modal', 'Explorer-Quota-Management-Modal'],
            },
            props: {
                explorer: {
                    stripeSubscription: {
                        transactionQuota: 10,
                        status: 'active',
                        cycleEndsAt: new Date(2023, 7, 28),
                        stripePlan: { name: 'Explorer 500', capabilities: { txLimit: 20 }}
                    }
                }
            }
        });
        await flushPromises();

        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should display button to start subscription', async () => {
        const wrapper = mount(ExplorerBilling, {
            global: {
                stubs: ['Update-Explorer-Plan-Modal', 'Explorer-Quota-Management-Modal'],
            },
            props: {
                explorer: {
                    stripeSubscription: null
                }
            }
        });
        await flushPromises();

        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should not display update button if sso', async () => {
        const wrapper = mount(ExplorerBilling, {
            global: {
                stubs: ['Update-Explorer-Plan-Modal', 'Explorer-Quota-Management-Modal'],
            },
            props: {
                sso: true,
                explorer: {
                    stripeSubscription: {
                        transactionQuota: 10,
                        status: 'active',
                        cycleEndsAt: new Date(2023, 7, 28),
                        stripePlan: { name: 'Explorer 500', capabilities: { txLimit: 20 }}
                    }
                }
            }
        });
        await flushPromises();

        expect(wrapper.html()).toMatchSnapshot();
    });
});

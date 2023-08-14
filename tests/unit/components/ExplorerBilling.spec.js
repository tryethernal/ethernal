import flushPromises from 'flush-promises';
import MockHelper from '../MockHelper';

import ExplorerBilling from '@/components/ExplorerBilling.vue';

let helper;
beforeEach(() => {
    jest.clearAllMocks()
    helper = new MockHelper();
});

describe('ExplorerBilling.vue', () => {
    it('Should display trial without card message', async () => {
        const wrapper = helper.mountFn(ExplorerBilling, {
            stubs: ['Update-Explorer-Modal'],
            propsData: {
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
        const wrapper = helper.mountFn(ExplorerBilling, {
            stubs: ['Update-Explorer-Modal'],
            propsData: {
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
        const wrapper = helper.mountFn(ExplorerBilling, {
            stubs: ['Update-Explorer-Modal'],
            propsData: {
                explorer: {
                    stripeSubscription: null
                }
            }
        });
        await flushPromises();

        expect(wrapper.html()).toMatchSnapshot();
    });
});

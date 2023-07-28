import flushPromises from 'flush-promises';
import MockHelper from '../MockHelper';

import ExplorerDangerZone from '@/components/ExplorerDangerZone.vue';

let helper;
beforeEach(() => {
    jest.clearAllMocks()
    helper = new MockHelper();
});

describe('ExplorerDangerZone.vue', () => {
    it('Should display a warning message and an active delete button if pending cancelation', async () => {
        const wrapper = helper.mountFn(ExplorerDangerZone, {
            propsData: {
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
        const wrapper = helper.mountFn(ExplorerDangerZone, {
            propsData: {
                explorer: {
                    id: 1,
                    stripeSubscription: { status: 'active' }
                }
            }
        });
        await flushPromises();

        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should have an active button if active subscription & billing disabled', async () => {
        const wrapper = helper.mountFn(ExplorerDangerZone, {
            propsData: {
                explorer: {
                    id: 1,
                    stripeSubscription: { status: 'active' }
                }
            },
            getters: {
                isBillingEnabled: jest.fn().mockReturnValue(false)
            }
        });
        await flushPromises();

        expect(wrapper.html()).toMatchSnapshot();
    });
});

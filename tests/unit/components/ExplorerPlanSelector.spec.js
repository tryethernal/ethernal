import flushPromises from 'flush-promises';
import MockHelper from '../MockHelper';

import ExplorerPlanSelector from '@/components/ExplorerPlanSelector.vue';

describe('ExplorerPlanSelector.vue', () => {
    let helper;

    beforeEach(() => {
        helper = new MockHelper();
        jest.spyOn(helper.mocks.server, 'getExplorerPlans').mockResolvedValueOnce({
            data: [
                { slug: '50', price: 50 },
                { slug: '100', price: 100 },
            ]
        });
    });

    it('Should display plans', async () => {
        const wrapper = helper.mountFn(ExplorerPlanSelector, {
            stubs: ['Explorer-Plan-Card']
        });

        await flushPromises();

        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should start a crypto subscription', async () => {
        jest.spyOn(helper.mocks.server, 'startCryptoSubscription').mockResolvedValueOnce();

        const wrapper = helper.mountFn(ExplorerPlanSelector, {
            propsData: {
                explorerId: 1
            },
            stubs: ['Explorer-Plan-Card'],
            getters: {
                user: jest.fn().mockReturnValue({ cryptoPaymentEnabled: true })
            }
        });

        await flushPromises();

        wrapper.vm.onPlanSelected('50');

        expect(helper.mocks.server.startCryptoSubscription).toHaveBeenCalledWith('50', 1);
    });

    it('Should redirect to a stripe checkout url', async () => {
        jest.spyOn(helper.mocks.server, 'createStripeExplorerCheckoutSession').mockResolvedValueOnce({ data: { url: 'stripe.com' }});

        const wrapper = helper.mountFn(ExplorerPlanSelector, {
            propsData: {
                explorerId: 1
            },
            stubs: ['Explorer-Plan-Card'],
            getters: {
                user: jest.fn().mockReturnValue({ cryptoPaymentEnabled: false })
            }
        });

        await flushPromises();

        wrapper.vm.onPlanSelected('50');

        expect(helper.mocks.server.createStripeExplorerCheckoutSession)
            .toHaveBeenCalledWith(1, '50', 'http://app.tryethernal.com/explorers/1?justCreated=true', 'http://app.tryethernal.com/explorers/1');
    });
});

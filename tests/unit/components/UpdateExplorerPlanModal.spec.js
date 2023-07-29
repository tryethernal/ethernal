import flushPromises from 'flush-promises';
import MockHelper from '../MockHelper';

import UpdateExplorerPlanModal from '@/components/UpdateExplorerPlanModal.vue';

let helper;
const plans = [{ slug: 'plan1', price: 10 }, { slug: 'plan2', price: 1 }];
beforeEach(() => {
    jest.clearAllMocks()
    helper = new MockHelper();
});

describe('UpdateExplorerPlanModal.vue', () => {
    it('Should start a crypto subscription', async () => {
        jest.spyOn(helper.mocks.server, 'startCryptoSubscription').mockResolvedValueOnce();

        const wrapper = helper.mountFn(UpdateExplorerPlanModal, {
            stubs: ['Explorer-Plan-Card'],
            getters: {
                user: jest.fn().mockReturnValue({ cryptoPaymentEnabled: true })
            },
            data() {
                return {
                    dialog: true,
                    explorerId: 1,
                    currentPlanSlug: null,
                    pendingCancelation: false,
                    plans
                }
            }
        });

        wrapper.vm.onUpdatePlan('plan1')
        await flushPromises();

        expect(helper.mocks.server.startCryptoSubscription).toHaveBeenCalled();
        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should start a stripe subscription', async () => {
        jest.spyOn(helper.mocks.server, 'createStripeExplorerCheckoutSession').mockResolvedValueOnce({ data: { url: 'stripe.com' }});
        const oldLocation = window.location;
        delete window.location;
        window.location = { ...oldLocation, assign: jest.fn() };
        const locationSpy = jest.spyOn(window.location, 'assign');

        const wrapper = helper.mountFn(UpdateExplorerPlanModal, {
            stubs: ['Explorer-Plan-Card'],
            getters: {
                user: jest.fn().mockReturnValue({ cryptoPaymentEnabled: false })
            },
            data() {
                return {
                    dialog: true,
                    explorerId: 1,
                    currentPlanSlug: null,
                    pendingCancelation: false,
                    plans
                }
            }
        });

        wrapper.vm.onUpdatePlan('plan1')
        await flushPromises();

        expect(helper.mocks.server.createStripeExplorerCheckoutSession).toHaveBeenCalledWith(1, 'plan1');
        expect(locationSpy).toHaveBeenCalledWith('stripe.com');
        expect(wrapper.html()).toMatchSnapshot();
        window.location = oldLocation;
    });

    it('Should update a subscription', async () => {
        jest.spyOn(helper.mocks.server, 'updateExplorerSubscription').mockResolvedValueOnce();
        const oldConfirm = window.confirm;
        window.confirm = jest.fn().mockReturnValue(true);

        const wrapper = helper.mountFn(UpdateExplorerPlanModal, {
            stubs: ['Explorer-Plan-Card'],
            getters: {
                user: jest.fn().mockReturnValue({ cryptoPaymentEnabled: false })
            },
            data() {
                return {
                    dialog: true,
                    explorerId: 1,
                    currentPlanSlug: 'plan1',
                    pendingCancelation: false,
                    plans
                }
            }
        });

        wrapper.vm.onUpdatePlan('plan2')
        await flushPromises();

        expect(helper.mocks.server.updateExplorerSubscription).toHaveBeenCalledWith(1, 'plan2');
        expect(window.confirm).toHaveBeenCalledWith(expect.stringContaining('This plan is cheaper'));
        expect(wrapper.html()).toMatchSnapshot();
        window.confirm = oldConfirm;
    });

    it('Should cancel a subscription', async () => {
        jest.spyOn(helper.mocks.server, 'cancelExplorerSubscription').mockResolvedValueOnce();
        const oldConfirm = window.confirm;
        window.confirm = jest.fn().mockReturnValue(true);

        const wrapper = helper.mountFn(UpdateExplorerPlanModal, {
            stubs: ['Explorer-Plan-Card'],
            getters: {
                user: jest.fn().mockReturnValue({ cryptoPaymentEnabled: false })
            },
            data() {
                return {
                    dialog: true,
                    explorerId: 1,
                    currentPlanSlug: 'plan1',
                    pendingCancelation: false,
                    plans
                }
            }
        });

        wrapper.vm.onUpdatePlan()
        await flushPromises();

        expect(helper.mocks.server.cancelExplorerSubscription).toHaveBeenCalledWith(1);
        expect(window.confirm).toHaveBeenCalledWith(expect.stringContaining('If you cancel now'));
        expect(wrapper.html()).toMatchSnapshot();
        window.confirm = oldConfirm;
    });
});

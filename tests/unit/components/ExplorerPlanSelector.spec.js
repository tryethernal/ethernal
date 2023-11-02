import flushPromises from 'flush-promises';
import MockHelper from '../MockHelper';

import ExplorerPlanSelector from '@/components/ExplorerPlanSelector.vue';
const plans = [{ slug: '50', price: 10 }, { slug: '100', price: 100 }];

const assign = window.location.assign;
const confirm = window.location.confirm;

beforeAll(() => {
    Object.defineProperty(window, 'location', { value: { assign: jest.fn() }});
    Object.defineProperty(window, 'confirm', { value: jest.fn() });
});

afterAll(() => {
    window.location.assign = assign;
    window.confirm = confirm;
});

describe('ExplorerPlanSelector.vue', () => {
    let helper;

    beforeEach(() => {
        helper = new MockHelper();
        window.confirm = jest.fn().mockImplementation(() => true);
        window.location.assign = jest.fn().mockImplementation(() => true);
        jest.spyOn(helper.mocks.server, 'getExplorerPlans').mockResolvedValue({ data: plans });
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

    it('Should update a subscription', async () => {
        jest.spyOn(helper.mocks.server, 'updateExplorerSubscription').mockResolvedValueOnce();

        const wrapper = helper.mountFn(ExplorerPlanSelector, {
            stubs: ['Explorer-Plan-Card'],
            propsData: {
                explorerId: 1,
                currentPlanSlug: '100',
                pendingCancelation: false,
            },
            getters: {
                user: jest.fn().mockReturnValue({ cryptoPaymentEnabled: true })
            }
        });
        await flushPromises();

        wrapper.vm.onPlanSelected('50');

        expect(helper.mocks.server.updateExplorerSubscription).toHaveBeenCalledWith(1, '50');
        expect(window.confirm).toHaveBeenCalledWith(expect.stringContaining('This plan is cheaper'));
    });

    it('Should cancel a subscription', async () => {
        jest.spyOn(helper.mocks.server, 'cancelExplorerSubscription').mockResolvedValueOnce();

        const wrapper = helper.mountFn(ExplorerPlanSelector, {
            stubs: ['Explorer-Plan-Card'],
            propsData: {
                explorerId: 1,
                currentPlanSlug: '100',
                pendingCancelation: false,
            },
            getters: {
                user: jest.fn().mockReturnValue({ cryptoPaymentEnabled: false })
            }
        });

        wrapper.vm.onPlanSelected()
        await flushPromises();

        expect(helper.mocks.server.cancelExplorerSubscription).toHaveBeenCalledWith(1);
        expect(window.confirm).toHaveBeenCalledWith(expect.stringContaining('If you cancel now'));
    });

    it('Should start a trial', async () => {
        jest.spyOn(helper.mocks.server, 'startTrial').mockResolvedValueOnce();

        const wrapper = helper.mountFn(ExplorerPlanSelector, {
            stubs: ['Explorer-Plan-Card'],
            propsData: {
                explorerId: 1,
                currentPlanSlug: null,
                pendingCancelation: false,
            },
            getters: {
                user: jest.fn().mockReturnValue({ canTrial: true })
            }
        });
        await flushPromises();

        wrapper.vm.onPlanSelected('100')

        expect(helper.mocks.server.startTrial).toHaveBeenCalledWith(1, '100');
    });
});

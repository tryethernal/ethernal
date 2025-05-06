import flushPromises from 'flush-promises';

import ExplorerPlanSelector from '@/components/ExplorerPlanSelector.vue';
const plans = [{ slug: '50', price: 10 }, { slug: '100', price: 100 }];

beforeAll(() => {
    vi.stubGlobal('location', { assign: vi.fn() });
    vi.stubGlobal('confirm', vi.fn().mockImplementation(() => true));
});

afterAll(() => {
    vi.unstubAllGlobals();
});

describe('ExplorerPlanSelector.vue', () => {

    beforeEach(() => {
        vi.spyOn(server, 'getExplorerPlans').mockResolvedValue({ data: plans });
    });

    it('Should display plans', async () => {
        const wrapper = mount(ExplorerPlanSelector, {
            global: {
                stubs: ['Explorer-Plan-Card']
            }
        });

        await flushPromises();

        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should start a crypto subscription', async () => {
        vi.spyOn(server, 'startCryptoSubscription').mockResolvedValueOnce();

        const wrapper = mount(ExplorerPlanSelector, {
            props: {
                explorerId: 1
            },
            global: {
                stubs: ['Explorer-Plan-Card'],
                plugins: [createTestingPinia({
                    initialState: {
                        user: {
                            cryptoPaymentEnabled: true
                        },
                        env: { mainDomain: 'ethernal.local:8080' }
                    }
                })],
            }
        });

        await flushPromises();

        wrapper.vm.onPlanSelected('50');

        expect(server.startCryptoSubscription).toHaveBeenCalledWith('50', 1);
    });

    it('Should redirect to a stripe checkout url', async () => {
        vi.spyOn(server, 'createStripeExplorerCheckoutSession').mockResolvedValueOnce({ data: { url: 'stripe.com' }});

        const wrapper = mount(ExplorerPlanSelector, {
            props: {
                explorerId: 1
            },
            global: {
                stubs: ['Explorer-Plan-Card'],
                plugins: [createTestingPinia({
                    initialState: {
                        user: {
                            cryptoPaymentEnabled: false
                        },
                        env: { mainDomain: 'app.ethernal.local:8080' }
                    }
                })],
            }
        });

        await flushPromises();

        wrapper.vm.onPlanSelected('50');

        expect(server.createStripeExplorerCheckoutSession)
            .toHaveBeenCalledWith(1, '50', 'http://app.ethernal.local:8080/explorers/1?justCreated=true', 'http://app.ethernal.local:8080/explorers/1');
    });

    it('Should update a subscription', async () => {
        vi.spyOn(server, 'updateExplorerSubscription').mockResolvedValueOnce();

        const wrapper = mount(ExplorerPlanSelector, {
            global: {
                stubs: ['Explorer-Plan-Card'],
                plugins: [createTestingPinia({
                    initialState: {
                        user: {
                            cryptoPaymentEnabled: true
                        },
                        env: { mainDomain: 'ethernal.local:8080' }
                    }
                })],
            },
            props: {
                explorerId: 1,
                currentPlanSlug: '100',
                pendingCancelation: false,
            },
        });
        await flushPromises();

        wrapper.vm.onPlanSelected('50');

        expect(server.updateExplorerSubscription).toHaveBeenCalledWith(1, '50');
        expect(window.confirm).toHaveBeenCalledWith(expect.stringContaining('This plan is cheaper'));
    });

    it('Should cancel a subscription', async () => {
        vi.spyOn(server, 'cancelExplorerSubscription').mockResolvedValueOnce();

        const wrapper = mount(ExplorerPlanSelector, {
            global: {
                stubs: ['Explorer-Plan-Card'],
                plugins: [createTestingPinia({
                    initialState: {
                        user: {
                            cryptoPaymentEnabled: false
                        },
                        env: { mainDomain: 'ethernal.local:8080' }
                    }
                })],
            },
            props: {
                explorerId: 1,
                currentPlanSlug: '100',
                pendingCancelation: false,
            },
        });

        wrapper.vm.onPlanSelected()
        await flushPromises();

        expect(server.cancelExplorerSubscription).toHaveBeenCalledWith(1);
        expect(window.confirm).toHaveBeenCalledWith(expect.stringContaining('If you cancel now'));
    });

    it('Should start a trial', async () => {
        vi.spyOn(server, 'startTrial').mockResolvedValueOnce();

        const wrapper = mount(ExplorerPlanSelector, {
            global: {
                stubs: ['Explorer-Plan-Card'],
                plugins: [createTestingPinia({
                    initialState: {
                        user: {
                            canTrial: true
                        },
                        env: { mainDomain: 'ethernal.local:8080' }
                    }
                })],
            },
            props: {
                explorerId: 1,
                currentPlanSlug: null,
                pendingCancelation: false,
            }
        });
        await flushPromises();

        wrapper.vm.onPlanSelected('100')

        expect(server.startTrial).toHaveBeenCalledWith(1, '100');
    });
});

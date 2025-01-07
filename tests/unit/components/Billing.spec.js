import flushPromises from 'flush-promises';
import Billing from '@/components/Billing.vue';

describe('Billing.vue', () => {
    it('Should display active explorers list', async () => {
        vi.spyOn(server, 'getExplorerBilling').mockResolvedValue({
            data: {
                activeExplorers: [
                    { id: 1, name: 'Test', planName: 'Team', subscriptionStatus: 'Active' }
                ],
                totalCost: 100
            }
        });

        const wrapper = mount(Billing, {
            global: {
                stubs: ['Create-Explorer-Modal'],
                mocks: {
                    $route: {
                        query: {}
                    }
                }
            }
        });
        await flushPromises();

        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should display the button to manage the subscription when the user has an active premium plan', async () => {
        vi.spyOn(server, 'getExplorerBilling').mockResolvedValue({
            data: {
                activeExplorers: [],
                totalCost: 0
            }
        });

        const wrapper = mount(Billing, {
            global: {
                stubs: ['Create-Explorer-Modal'],
                plugins: [createTestingPinia({ initialState: { user: { plan: 'premium' } } })],
                mocks: {
                    $route: {
                        query: {}
                    }
                }
            }
        });
        await flushPromises();

        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should display the button to start the subscription when the user is on a free plan', async () => {
        vi.spyOn(server, 'getExplorerBilling').mockResolvedValue({
            data: {
                activeExplorers: [],
                totalCost: 0
            }
        });

        const wrapper = mount(Billing, {
            global: {
                stubs: ['Create-Explorer-Modal'],
                mocks: {
                    $route: {
                        query: {}
                    }
                }
            }
        });
        await flushPromises();

        expect(wrapper.html()).toMatchSnapshot();
    });
});

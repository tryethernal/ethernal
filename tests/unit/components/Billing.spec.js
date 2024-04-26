import flushPromises from 'flush-promises';
import MockHelper from '../MockHelper';
import Billing from '@/components/Billing.vue';

describe('Billing.vue', () => {
    let helper;

    beforeEach(async () => {
        helper = new MockHelper();
    });

    it('Should display active explorers list', async () => {
        jest.spyOn(helper.mocks.server, 'getExplorerBilling').mockResolvedValue({
            data: {
                activeExplorers: [
                    { id: 1, name: 'Test', planName: 'Team', subscriptionStatus: 'Active' }
                ],
                totalCost: 100
            }
        });

        const wrapper = helper.mountFn(Billing, {
            stubs: ['Create-Explorer-Modal'],
            getters: {
                user: jest.fn().mockReturnValue({
                    plan: 'premium'
                })
            }
        });
        await flushPromises();

        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should display the button to manage the subscription when the user has an active premium plan', async () => {
        jest.spyOn(helper.mocks.server, 'getExplorerBilling').mockResolvedValue({
            data: {
                activeExplorers: [],
                totalCost: 0
            }
        });

        const wrapper = helper.mountFn(Billing, {
            stubs: ['Create-Explorer-Modal'],
            getters: {
                user: jest.fn().mockReturnValue({
                    plan: 'premium'
                })
            }
        });
        await flushPromises();

        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should display the button to start the subscription when the user is on a free plan', async () => {
        jest.spyOn(helper.mocks.server, 'getExplorerBilling').mockResolvedValue({
            data: {
                activeExplorers: [],
                totalCost: 0
            }
        });

        const wrapper = helper.mountFn(Billing, {
            stubs: ['Create-Explorer-Modal'],
            getters: {
                user: jest.fn().mockReturnValue({
                    plan: 'free'
                })
            }
        });
        await flushPromises();

        expect(wrapper.html()).toMatchSnapshot();
    });
});

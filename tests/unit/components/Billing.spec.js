import MockHelper from '../MockHelper';
import Billing from '@/components/Billing.vue';

describe('Billing.vue', () => {
    let helper;

    beforeEach(async () => {
        helper = new MockHelper();
    });

    it('Should display the button to manage the subscription when the user has an active premium plan', () => {
        const wrapper = helper.mountFn(Billing, {
            getters: {
                user: jest.fn().mockReturnValue({
                    plan: 'premium'
                })
            }
        });
        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should display the button to start the subscription when the user is on a free plan', () => {
        const wrapper = helper.mountFn(Billing, {
            getters: {
                user: jest.fn().mockReturnValue({
                    plan: 'free'
                })
            }
        });
        expect(wrapper.html()).toMatchSnapshot();
    });
});

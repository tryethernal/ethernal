import MockHelper from '../MockHelper';

import Billing from '@/components/Billing.vue';

describe('Billing.vue', () => {
    let helper, db;

    beforeEach(async () => {
        helper = new MockHelper();
    });

    it('Should display the button to start the trial when user has no plan & did not trial already', async (done) => {
        const wrapper = helper.mountFn(Billing);
        expect(wrapper.html()).toMatchSnapshot();
        done();
    });

    it('Should display the button to manage the subscription when the user has an active premium plan w/o trial', async (done) => {
        helper.getters.user.mockImplementation(() => { return { plan: 'premium' }});
        helper.getters.hasTrialed.mockImplementation(() => true);
        const wrapper = helper.mountFn(Billing);
        expect(wrapper.html()).toMatchSnapshot();
        done();
    });

    it('Should display the button to manage the subscription when the user is trialing', async (done) => {
        helper.getters.user.mockImplementation(() => { return { plan: 'premium', trialEndsAt: new Date('2021', '09', '11') }});
        helper.getters.hasTrialed.mockImplementation(() => true);
        helper.getters.isTrialActive.mockImplementation(() => true);
        const wrapper = helper.mountFn(Billing);
        expect(wrapper.html()).toMatchSnapshot();
        done();
    });

    it('Should display the button to start the subscription when the user is on a free plan and has already trialed', async (done) => {
        helper.getters.user.mockImplementation(() => { return { plan: 'free', trialEndsAt: new Date('2021', '09', '11') }});
        helper.getters.hasTrialed.mockImplementation(() => true);
        const wrapper = helper.mountFn(Billing);
        expect(wrapper.html()).toMatchSnapshot();
        done();
    });

    afterEach(async () => {
        await helper.clearFirebase();
    });
});

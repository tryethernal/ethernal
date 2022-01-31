jest.mock('@/plugins/firebase', () => ({
    ...jest.requireActual('@/plugins/firebase'),
    auth: jest.fn(() => {
        return {
            currentUser: {
                metadata: {
                    creationTime: new Date()
                }
            }
        };
    })
}));
import { auth } from '@/plugins/firebase';
import MockHelper from '../MockHelper';
import Billing from '@/components/Billing.vue';

describe('Billing.vue', () => {
    let helper, db;

    beforeEach(async () => {
        helper = new MockHelper();
    });


    it('Should display the button to manage the subscription when the user has an active premium plan', async (done) => {
        helper.getters.user.mockImplementation(() => { return { plan: 'premium' }});
        const wrapper = helper.mountFn(Billing);
        expect(wrapper.html()).toMatchSnapshot();
        done();
    });

    it('Should display the button to start the subscription when the user is on a free plan', async (done) => {
        helper.getters.user.mockImplementation(() => { return { plan: 'free' }});
        const wrapper = helper.mountFn(Billing);
        expect(wrapper.html()).toMatchSnapshot();
        done();
    });

    afterEach(async () => {
        await helper.clearFirebase();
    });
});

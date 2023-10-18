import MockHelper from '../MockHelper';

import Auth from '@/components/Auth.vue';

const helper = new MockHelper();

describe('Auth.vue', () => {
    beforeEach(() => jest.clearAllMocks());

    it('Should display an explorer migration message', async () => {
        const wrapper = helper.mountFn(Auth, {
            computed: {
                explorerToken() { return 'token' }
            }
        });

        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should load the signin screen', async () => {
        const wrapper = helper.mountFn(Auth);

        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should load the signup screen', async () => {
        const wrapper = helper.mountFn(Auth);
        await wrapper.setData({ mode: 'signup' });

        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should load the send reset password email screen', async () => {
        const wrapper = helper.mountFn(Auth);
        await wrapper.setData({ mode: 'forgottenPwd' });

        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should load the reset password screen', async () => {
        const wrapper = helper.mountFn(Auth);
        await wrapper.setData({ mode: 'resetPwd' });

        expect(wrapper.html()).toMatchSnapshot();
    });
});

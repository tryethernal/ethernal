import Auth from '@/components/Auth.vue';

describe('Auth.vue', () => {
    it('Should display an explorer migration message', async () => {
        const wrapper = mount(Auth, {
            global: {
                mocks: {
                    $route: {
                        query: {
                            explorerToken: 'token'
                        }
                    }
                }
            }
        });

        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should load the signin screen', async () => {
        const wrapper = mount(Auth, {
            global: {
                mocks: {
                    $route: {
                        query: {}
                    }
                }
            }
        });

        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should load the signup screen', async () => {
        const wrapper = mount(Auth, {
            global: {
                mocks: {
                    $route: {
                        query: {}
                    }
                }
            }
        });
        await wrapper.setData({ mode: 'signup' });

        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should load the send reset password email screen', async () => {
        const wrapper = mount(Auth, {
            global: {
                mocks: {
                    $route: {
                        query: {}
                    }
                }
            }
        });
        await wrapper.setData({ mode: 'forgottenPwd' });

        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should load the reset password screen', async () => {
        const wrapper = mount(Auth, {
            global: {
                mocks: {
                    $route: {
                        query: {}
                    }
                }
            }
        });
        await wrapper.setData({ mode: 'resetPwd' });

        expect(wrapper.html()).toMatchSnapshot();
    });
});

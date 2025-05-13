import SelfHostedSetupUser from '@/components/SelfHostedSetupUser.vue';

describe('SelfHostedSetupUser.vue', () => {
    it('validates required fields', async () => {
        const wrapper = mount(SelfHostedSetupUser, {
            global: {
                provide: {
                    $server: { signUp: vi.fn() }
                }
            }
        });
        await wrapper.find('form').trigger('submit.prevent');
        expect(wrapper.html()).toMatchSnapshot();
    });

    it('shows error on failed signup', async () => {
        vi.spyOn(server, 'signUp').mockRejectedValueOnce({ message: 'fail' });
        const wrapper = mount(SelfHostedSetupUser);
        await wrapper.find('input[type=email]').setValue('a@b.com');
        await wrapper.find('input[type=password]').setValue('password123');
        await wrapper.find('form').trigger('submit.prevent');
        await flushPromises();
        expect(wrapper.html()).toMatchSnapshot();
    });

    it('shows success UI on user creation', async () => {
        vi.spyOn(server, 'signUp').mockResolvedValueOnce();
        const wrapper = mount(SelfHostedSetupUser);
        await wrapper.find('input[type=email]').setValue('a@b.com');
        await wrapper.find('input[type=password]').setValue('password123');
        await wrapper.find('form').trigger('submit.prevent');
        await flushPromises();
        expect(wrapper.html()).toMatchSnapshot();
    });
});

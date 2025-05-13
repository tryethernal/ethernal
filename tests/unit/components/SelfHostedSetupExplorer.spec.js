import SelfHostedSetupExplorer from '@/components/SelfHostedSetupExplorer.vue';

const stubs = [];

describe('SelfHostedSetupExplorer.vue', () => {
    it('validates required fields', async () => {
        const wrapper = mount(SelfHostedSetupExplorer, {
            global: {
                stubs,
                provide: {
                    $server: {
                        getCurrentUser: vi.fn().mockResolvedValue({ data: { id: 1 } }),
                        createExplorerFromOptions: vi.fn().mockResolvedValue({ data: { id: 42, slug: 'slug' } })
                    }
                }
            }
        });
        await wrapper.find('form').trigger('submit.prevent');
        expect(wrapper.html()).toMatchSnapshot();
    });

    it('shows error on failed explorer creation', async () => {
        const createExplorerFromOptions = vi.fn().mockRejectedValueOnce({ message: 'fail' });
        const wrapper = mount(SelfHostedSetupExplorer, {
            global: {
                stubs,
                provide: {
                    $server: {
                        getCurrentUser: vi.fn().mockResolvedValue({ data: { id: 1 } }),
                        createExplorerFromOptions
                    }
                }
            }
        });
        await wrapper.find('input[type=text]').setValue('My Explorer');
        await wrapper.findAll('input[type=text]')[1].setValue('http://localhost:8545');
        await wrapper.find('form').trigger('submit.prevent');
        await flushPromises();
        expect(wrapper.html()).toMatchSnapshot();
    });

    it('emits explorer-created on success', async () => {
        const getCurrentUser = vi.fn().mockResolvedValue({ data: { id: 1 } });
        const createExplorerFromOptions = vi.fn().mockResolvedValue({ data: { id: 42, slug: 'slug' } });
        const wrapper = mount(SelfHostedSetupExplorer, {
            global: {
                stubs,
                provide: {
                    $server: {
                        getCurrentUser,
                        createExplorerFromOptions
                    }
                }
            }
        });
        await wrapper.find('input[type=text]').setValue('My Explorer');
        await wrapper.findAll('input[type=text]')[1].setValue('http://localhost:8545');
        await wrapper.find('form').trigger('submit.prevent');
        await flushPromises();
        expect(wrapper.html()).toMatchSnapshot();
    });
});

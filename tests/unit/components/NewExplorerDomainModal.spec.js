import flushPromises from 'flush-promises';

import NewExplorerDomainModal from '@/components/NewExplorerDomainModal.vue';

describe('NewExplorerDomainModal.vue', () => {
    it('Should display dns setup info', async () => {
        const wrapper = mount(NewExplorerDomainModal, {
            global: {
                plugins: [createTestingPinia({
                    initialState: {
                        env: { isSelfHosted: false }
                    }
                })]
            },
            data() {
                return {
                    dialog: true,
                    resolve: vi.fn().mockResolvedValue(),
                    domain: 'explorer.protocol.com'
                }
            }
        });
        await flushPromises();

        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should display correct html when the input is filled with a domain name', async () => {
        const wrapper = mount(NewExplorerDomainModal, {
            global: {
                plugins: [createTestingPinia({
                    initialState: {
                        env: { isSelfHosted: false }
                    }
                })]
            },
            data() {
                return {
                    dialog: true,
                    resolve: vi.fn().mockResolvedValue(),
                    domain: ''
                }
            }
        });
        // Simulate user input
        await flushPromises();
        await wrapper.find('input').setValue('explorer.protocol.com');
        await flushPromises();

        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should display correct html when the input is filled with a domain name in self-hosted setup', async () => {
        const wrapper = mount(NewExplorerDomainModal, {
            global: {
                plugins: [createTestingPinia({
                    initialState: {
                        env: { isSelfHosted: true }
                    }
                })]
            },
            data() {
                return {
                    dialog: true,
                    resolve: vi.fn().mockResolvedValue(),
                    domain: ''
                }
            }
        });
        // Simulate user input
        await flushPromises();
        await wrapper.find('input').setValue('explorer.protocol.com');
        await flushPromises();

        expect(wrapper.html()).toMatchSnapshot();
    });

});

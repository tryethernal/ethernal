import flushPromises from 'flush-promises';

import ExplorerBranding from '@/components/ExplorerBranding.vue';

describe('ExplorerBranding.vue', () => {
    it('Should display branding options', async () => {
        const wrapper = mount(ExplorerBranding, {
            global: {
                stubs: ['New-Explorer-Link', 'v-color-picker'],
            },
            props: {
                disabled: false,
                explorer: {
                    id: 1,
                    themes: {
                        links: [{ icon: 'twitter', url: 'twitter.com', name: 'twitter', uid: 1 }],
                        light: {
                            primary: '#32a852'
                        }
                    }
                }
            }
        });
        await flushPromises();

        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should display upgrade message', async () => {
        const wrapper = mount(ExplorerBranding, {
            global: {
                stubs: ['New-Explorer-Link', 'v-color-picker'],
            },
            props: {
                disabled: true,
                explorer: {
                    id: 1,
                    themes: {
                        links: [{ icon: 'twitter', url: 'twitter.com', name: 'twitter', uid: 1 }],
                        light: {
                            primary: '#32a852'
                        }
                    }
                }
            }
        });
        await flushPromises();

        expect(wrapper.html()).toMatchSnapshot();
    });
});

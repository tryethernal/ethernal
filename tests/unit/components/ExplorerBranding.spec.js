import flushPromises from 'flush-promises';
import MockHelper from '../MockHelper';

import ExplorerBranding from '@/components/ExplorerBranding.vue';

let helper;
beforeEach(() => {
    jest.clearAllMocks()
    helper = new MockHelper();
});

describe('ExplorerBranding.vue', () => {
    it('Should display branding options', async () => {
        const wrapper = helper.mountFn(ExplorerBranding, {
            stubs: ['New-Explorer-Link', 'v-color-picker'],
            propsData: {
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
        const wrapper = helper.mountFn(ExplorerBranding, {
            stubs: ['New-Explorer-Link', 'v-color-picker'],
            propsData: {
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

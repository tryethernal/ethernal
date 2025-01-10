import flushPromises from 'flush-promises';

import ExplorerDomainsList from '@/components/ExplorerDomainsList.vue';

describe('ExplorerDomainsList.vue', () => {
    it('Should display domains list', async () => {
        const wrapper = mount(ExplorerDomainsList, {
            global: {
                stubs: ['Explorer-Domain', 'New-Explorer-Domain-Modal'],
            },
            propsData: {
                disabled: false,
                explorer: {
                    domains: [{ id: 1 }, { id: 2 }]
                }
            }
        });
        await flushPromises();

        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should be disabled', async () => {
        const wrapper = mount(ExplorerDomainsList, {
            global: {
                stubs: ['Explorer-Domain', 'New-Explorer-Domain-Modal'],
            },
            props: {
                disabled: true,
                explorer: {
                    domains: [{ id: 1 }, { id: 2 }]
                }
            }
        });
        await flushPromises();

        expect(wrapper.html()).toMatchSnapshot();
    });
});

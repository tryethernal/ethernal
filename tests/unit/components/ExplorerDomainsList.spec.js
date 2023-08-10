import flushPromises from 'flush-promises';
import MockHelper from '../MockHelper';

import ExplorerDomainsList from '@/components/ExplorerDomainsList.vue';

let helper;
beforeEach(() => {
    jest.clearAllMocks()
    helper = new MockHelper();
});

describe('ExplorerDomainsList.vue', () => {
    it('Should display domains list', async () => {
        const wrapper = helper.mountFn(ExplorerDomainsList, {
            stubs: ['Explorer-Domain', 'New-Explorer-Domain-Modal'],
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
        const wrapper = helper.mountFn(ExplorerDomainsList, {
            stubs: ['Explorer-Domain', 'New-Explorer-Domain-Modal'],
            propsData: {
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

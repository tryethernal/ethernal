import MockHelper from '../MockHelper';
import flushPromises from 'flush-promises';

import StorageStructure from '@/components/StorageStructure.vue';
import StorageProp from '../fixtures/StorageProp.json';

describe('StorageStructure.vue', () => {
    let helper;

    beforeEach(() => {
        helper = new MockHelper();
    });

    it('Should display the correct info', async () => {
        const wrapper = helper.mountFn(StorageStructure, {
            propsData: {
                storage: StorageProp
            }
        });
        await flushPromises();

        expect(wrapper.html()).toMatchSnapshot();
    });
});

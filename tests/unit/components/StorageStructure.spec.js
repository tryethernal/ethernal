import MockHelper from '../MockHelper';

import StorageStructure from '@/components/StorageStructure.vue';
import StorageProp from '../fixtures/StorageProp.json';

describe('StorageStructure.vue', () => {
    let helper;

    beforeEach(() => {
        helper = new MockHelper();
    });

    it('Should display the correct info', async (done) => {
        const wrapper = helper.mountFn(StorageStructure, {
            propsData: {
                storage: StorageProp
            }
        })
        expect(wrapper.html()).toMatchSnapshot();
        done();
    });

    afterEach(async () => {
        await helper.clearFirebase();
    });
});

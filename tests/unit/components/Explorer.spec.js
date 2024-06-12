import flushPromises from 'flush-promises';
import MockHelper from '../MockHelper';

import Explorer from '@/components/Explorer.vue';

beforeEach(() => jest.clearAllMocks());

describe('Explorer.vue', () => {
    let helper;

    beforeEach(() => {
        helper = new MockHelper();
    });

    it('Should display explorer sections', async() => {
        const wrapper = helper.mountFn(Explorer, {
            stubs: ['Explorer-General', 'Explorer-Faucet-Settings'],
            propsData: {
                id: 1
            }
        });
        await flushPromises();

        expect(wrapper.html()).toMatchSnapshot();
    });
});

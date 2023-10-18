import MockHelper from '../MockHelper';

import DemoExplorerSetup from '@/components/DemoExplorerSetup.vue';

let helper;
beforeEach(() => {
    jest.clearAllMocks()
    helper = new MockHelper();
});

describe('DemoExplorerSetup.vue', () => {
    it('Should display demo explorer setup page', async () => {
        const wrapper = helper.mountFn(DemoExplorerSetup);

        expect(wrapper.html()).toMatchSnapshot();
    });
});

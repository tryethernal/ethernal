import MockHelper from '../MockHelper';

import DemoExplorerSetup from '@/components/DemoExplorerSetup.vue';

let helper;
beforeEach(() => {
    jest.clearAllMocks()
    helper = new MockHelper();
});

describe('DemoExplorerSetup.vue', () => {
    it('Should display demo explorer setup page', async () => {
        jest.spyOn(helper.mocks.server, 'getCurrentUser').mockResolvedValue({ data: { id: 1 }});
        const wrapper = helper.mountFn(DemoExplorerSetup);

        expect(wrapper.html()).toMatchSnapshot();
    });
});

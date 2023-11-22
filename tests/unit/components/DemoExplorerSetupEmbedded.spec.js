import MockHelper from '../MockHelper';

import DemoExplorerSetupEmbedded from '@/components/DemoExplorerSetupEmbedded.vue';

let helper;
beforeEach(() => {
    jest.clearAllMocks()
    helper = new MockHelper();
});

describe('DemoExplorerSetupEmbedded.vue', () => {
    it('Should display embeddable setup', async () => {
        jest.spyOn(helper.mocks.server, 'getCurrentUser').mockResolvedValue({ data: { id: 1 }});
        const wrapper = helper.mountFn(DemoExplorerSetupEmbedded);

        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should display success message with domain', async () => {
        jest.spyOn(helper.mocks.server, 'getCurrentUser').mockResolvedValue({ data: { id: 1 }});
        const wrapper = helper.mountFn(DemoExplorerSetupEmbedded);
        await wrapper.setData({ domain: 'my.explorer.com' });

        expect(wrapper.html()).toMatchSnapshot();
    });
});

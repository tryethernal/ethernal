import MockHelper from '../MockHelper';

import PublicExplorerExplainerModal from '@/components/PublicExplorerExplainerModal.vue';

const helper = new MockHelper();

describe('PublicExplorerExplainerModal.vue', () => {
    beforeEach(() => jest.clearAllMocks());

    it('Should load the modal and display the user email', async () => {
        const wrapper = helper.mountFn(PublicExplorerExplainerModal);

        wrapper.setData({ dialog: true });
        await wrapper.vm.$nextTick();

        expect(wrapper.html()).toMatchSnapshot();
    });
});

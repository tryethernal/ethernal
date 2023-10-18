import MockHelper from '../MockHelper';

import ExplorerMigratedModal from '@/components/ExplorerMigratedModal.vue';

let helper;
beforeEach(() => {
    jest.clearAllMocks()
    helper = new MockHelper();
});

describe('ExplorerMigratedModal.vue', () => {
    it('Should display waiting screen', async () => {
        const wrapper = helper.mountFn(ExplorerMigratedModal, {
            data() {
                return {
                    dialog: true,
                    explorerId: 1
                }
            }
        });

        expect(wrapper.html()).toMatchSnapshot();
    });
});

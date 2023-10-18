import MockHelper from '../MockHelper';

import ExplorerMigratedModal from '@/components/ExplorerMigratedModal.vue';

let helper;
beforeEach(() => {
    jest.clearAllMocks()
    helper = new MockHelper();
});

describe('ExplorerMigratedModal.vue', () => {
    it('Should display link to demo explorer', async () => {
        const wrapper = helper.mountFn(ExplorerMigratedModal, {
            data() {
                return {
                    dialog: true,
                    domain: 'http://my.explorer.com',
                }
            }
        });

        expect(wrapper.html()).toMatchSnapshot();
    });
});

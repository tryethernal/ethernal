import MockHelper from '../MockHelper';

import DemoExplorerReadyModal from '@/components/DemoExplorerReadyModal.vue';

let helper;
beforeEach(() => {
    jest.clearAllMocks()
    helper = new MockHelper();
});

describe('DemoExplorerReadyModal.vue', () => {
    it('Should display link to demo explorer', async () => {
        const wrapper = helper.mountFn(DemoExplorerReadyModal, {
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

import MockHelper from '../MockHelper';

import UpdateExplorerPlanModal from '@/components/UpdateExplorerPlanModal.vue';

let helper;
beforeEach(() => {
    jest.clearAllMocks()
    helper = new MockHelper();
});

describe('UpdateExplorerPlanModal.vue', () => {
    it('Should display plan selector', () => {
        const wrapper = helper.mountFn(UpdateExplorerPlanModal, {
            stubs: ['Explorer-Plan-Selector'],
            getters: {
                user: jest.fn().mockReturnValue({ cryptoPaymentEnabled: false, canTrial: true })
            },
            data() {
                return {
                    dialog: true,
                    options: {
                        currentPlanSlug: '100',
                        pendingCancelation: false
                    }
                }
            }
        });

        expect(wrapper.html()).toMatchSnapshot();
    });
});

import UpdateExplorerPlanModal from '@/components/UpdateExplorerPlanModal.vue';

describe('UpdateExplorerPlanModal.vue', () => {
    it('Should display plan selector', () => {
        const wrapper = mount(UpdateExplorerPlanModal, {
            global: {
                stubs: ['Explorer-Plan-Selector'],
                plugins: [createTestingPinia({
                    initialState: {
                        user: {
                            cryptoPaymentEnabled: false,
                            canTrial: true
                        }
                    }
                })]
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

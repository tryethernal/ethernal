import TraceStep from '@/components/TraceStep.vue';
import TraceStepProp from '../fixtures/TraceStepProp.json';

describe('TraceStep.vue', () => {
    it('Should display the formatted step', () => {
        const wrapper = mount(TraceStep, {
            props: {
                step: TraceStepProp
            },
            global: {
                stubs: ['Hash-Link'],
                plugins: [createTestingPinia({
                    initialState: {
                        explorerStore: {
                            token: 'ETL'
                        }
                    }
                })]
            }
        });

        expect(wrapper.html()).toMatchSnapshot();
    });
});

import MockHelper from '../MockHelper';

import TraceStep from '@/components/TraceStep.vue';
import TraceStepProp from '../fixtures/TraceStepProp.json';

describe('TraceStep.vue', () => {
    let helper;

    beforeEach(() => {
        helper = new MockHelper();
    });

    it('Should display the formatted step', async (done) => {
        const wrapper = helper.mountFn(TraceStep, {
            propsData: {
                step: TraceStepProp
            }
        });
        expect(wrapper.html()).toMatchSnapshot();
        done();
    });

    afterEach(async () => {
        await helper.clearFirebase();
    });
});

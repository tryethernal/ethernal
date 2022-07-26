import flushPromises from 'flush-promises';
import MockHelper from '../MockHelper';

import TraceStep from '@/components/TraceStep.vue';
import TraceStepProp from '../fixtures/TraceStepProp.json';

describe('TraceStep.vue', () => {
    let helper;

    beforeEach(() => {
        helper = new MockHelper();
    });

    it('Should display the formatted step', () => {
        const wrapper = helper.mountFn(TraceStep, {
            propsData: {
                step: TraceStepProp
            },
            stubs: ['Hash-Link']
        });

        expect(wrapper.html()).toMatchSnapshot();
    });
});

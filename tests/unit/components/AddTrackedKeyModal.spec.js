import MockHelper from '../MockHelper';

import AddTrackedKeyModal from '@/components/AddTrackedKeyModal.vue';
import flushPromises from 'flush-promises';

describe('AddTrackedKeyModal.vue', () => {
    let helper;

    beforeEach(async () => {
        helper = new MockHelper();
    });

    it('Should let you add a tracking key', async (done) => {
        const wrapper = helper.mountFn(AddTrackedKeyModal);

        wrapper.vm.open({ variableIndex: 1 });
        await wrapper.vm.$nextTick();

        const resolveMock = jest.spyOn(wrapper.vm, 'resolve');

        await wrapper.find('#newKey').setValue('0x0');
        await wrapper.find('#addKey').trigger('click');

        await setTimeout(() => {
            expect(resolveMock).toHaveBeenCalledWith({ variableIndex: 1, key: '0x0' });
            expect(wrapper.vm.dialog).toBe(false);
            expect(wrapper.vm.resolve).toBe(null);
            expect(wrapper.vm.reject).toBe(null);
            expect(wrapper.vm.newKeyToTrack).toBe(null);
            expect(wrapper.vm.options.variableIndex).toBe(null);
        }, 1500);

        expect(wrapper.html()).toMatchSnapshot();
        done();
    });
});

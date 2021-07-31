import MockHelper from '../MockHelper';

import ApiIntegrationModal from '@/components/ApiIntegrationModal.vue';

describe('ApiIntegrationModal.vue', () => {
    let helper;
    
    it('Should let you enable the API', async (done) => {
        helper = new MockHelper({ rpcServer: 'http://localhost:8545' });
        const enableWorkspaceApiMock = jest.spyOn(helper.mocks.server, 'enableWorkspaceApi');

        const wrapper = helper.mountFn(ApiIntegrationModal);

        wrapper.vm.open();
        await wrapper.vm.$nextTick();

        expect(wrapper.vm.token).toBeFalsy();
        expect(wrapper.find('#token').isVisible()).toBe(false);

        await wrapper.find('#apiSwitch').trigger('click');
        await wrapper.vm.$nextTick();

        expect(wrapper.find('#token').element.value).toMatch(/123456abcdef/);

        expect(enableWorkspaceApiMock).toHaveBeenCalled();
        expect(wrapper.vm.token).toBeTruthy();
        expect(wrapper.html()).toMatchSnapshot();
        done();
    });

    it('Should let you disable the API', async (done) => {
        helper = new MockHelper({ rpcServer: 'http://localhost:8545' });
        const disableWorkspaceApiMock = jest.spyOn(helper.mocks.server, 'disableWorkspaceApi');

        const wrapper = helper.mountFn(ApiIntegrationModal);

        wrapper.vm.open({ enabled: true });
        await wrapper.vm.$nextTick();
        await wrapper.vm.$nextTick();

        expect(wrapper.vm.token).toBeTruthy();
        expect(wrapper.find('#token').isVisible()).toBe(true);
        
        await wrapper.find('#apiSwitch').trigger('click');
        await wrapper.vm.$nextTick();

        expect(disableWorkspaceApiMock).toHaveBeenCalled();
        expect(wrapper.vm.token).toBeFalsy();
        expect(wrapper.html()).toMatchSnapshot();
        done();
    });

    afterEach(async () => {
        await helper.clearFirebase();
    });
});

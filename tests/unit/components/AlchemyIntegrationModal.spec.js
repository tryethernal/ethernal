import MockHelper from '../MockHelper';

import AlchemyIntegrationModal from '@/components/AlchemyIntegrationModal.vue';
import flushPromises from 'flush-promises';

describe('AlchemyIntegrationModal.vue', () => {
    let helper;

    it('Should display a message if you are not in an Alchemy workspace', async (done) => {
        helper = new MockHelper({ rpcServer: 'http://localhost:8545' });

        const wrapper = helper.mountFn(AlchemyIntegrationModal);

        wrapper.vm.open();
        await wrapper.vm.$nextTick();

        expect(wrapper.html()).toMatchSnapshot();
        done();
    });

    it('Should let you enable a webhook', async (done) => {
        helper = new MockHelper({ rpcServer: 'http://alchemyapi.io/1234' });
        const enableAlchemyWebhookMock = jest.spyOn(helper.mocks.server, 'enableAlchemyWebhook');

        const wrapper = helper.mountFn(AlchemyIntegrationModal);

        wrapper.vm.open();
        await wrapper.vm.$nextTick();

        expect(wrapper.vm.token).toBeFalsy();
        expect(wrapper.find('#webhook').isVisible()).toBe(false);

        await wrapper.find('#webhookSwitch').trigger('click');
        await wrapper.vm.$nextTick();

        expect(wrapper.find('#webhook').element.value).toMatch(/token=123456abcdef/);

        expect(enableAlchemyWebhookMock).toHaveBeenCalled();
        expect(wrapper.vm.token).toBeTruthy();
        expect(wrapper.html()).toMatchSnapshot();
        done();
    });

    it('Should let you disable a webhook', async (done) => {
        helper = new MockHelper({ rpcServer: 'http://alchemyapi.io/1234' });
        const disableAlchemyWebhookMock = jest.spyOn(helper.mocks.server, 'disableAlchemyWebhook');

        const wrapper = helper.mountFn(AlchemyIntegrationModal);

        wrapper.vm.open({ enabled: true });
        await wrapper.vm.$nextTick();
        await wrapper.vm.$nextTick();

        expect(wrapper.vm.token).toBeTruthy();
        expect(wrapper.find('#webhook').isVisible()).toBe(true);
        
        await wrapper.find('#webhookSwitch').trigger('click');
        await wrapper.vm.$nextTick();

        expect(disableAlchemyWebhookMock).toHaveBeenCalled();
        expect(wrapper.vm.token).toBeFalsy();
        expect(wrapper.html()).toMatchSnapshot();
        done();
    });

    afterEach(async () => {
        await helper.clearFirebase();
    });
});

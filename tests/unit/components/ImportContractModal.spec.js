import MockHelper from '../MockHelper';
  
import ImportContractModal from '@/components/ImportContractModal.vue';

describe('ImportContractModal.vue', () => {
    let helper;

    beforeEach(() => {
        helper = new MockHelper();
    });

    it('Should let the user import a verified mainnet contract', async (done) => {
        const wrapper = helper.mountFn(ImportContractModal);
        const importContractMock = jest.spyOn(helper.mocks.server, 'importContract');
        await wrapper.setData({ dialog: true, options: { contractsCount: 1 } });

        await wrapper.find('#contractAddress').setValue('0x123');
        await wrapper.find('#importContract').trigger('click');

        await wrapper.vm.$nextTick();
        expect(importContractMock).toHaveBeenCalled();
        expect(wrapper.html()).toMatchSnapshot();
        done();
    });

    it('Should let the user import a non verified mainnet contract', async (done) => {
        helper.mocks.server.importContract = () => {
            return new Promise((resolve) => resolve({ data: { success: true, contractIsVerified: false }}));
        };
        const wrapper = helper.mountFn(ImportContractModal);
        const importContractMock = jest.spyOn(helper.mocks.server, 'importContract');
        await wrapper.setData({ dialog: true, options: { contractsCount: 1 } });

        await wrapper.find('#contractAddress').setValue('0x123');
        await wrapper.find('#importContract').trigger('click');

        await wrapper.vm.$nextTick();
        expect(importContractMock).toHaveBeenCalled();
        expect(wrapper.html()).toMatchSnapshot();
        done();
    });

    it('Should warn the user if he is on a free plan and has already 10 contracts', async (done) => {
        const wrapper = helper.mountFn(ImportContractModal);
        await wrapper.setData({ dialog: true, options: { contractsCount: 10 } });

        await wrapper.find('#contractAddress').setValue('0x123');
        await wrapper.find('#importContract').trigger('click');

        await wrapper.vm.$nextTick();
        expect(wrapper.html()).toMatchSnapshot();
        done();
    });

    it('Should not warn the user if he is on a premium plan and has already 10 contracts', async (done) => {
        helper.getters.user.mockImplementation(() => { return { plan: 'premium' } });
        const wrapper = helper.mountFn(ImportContractModal);
        await wrapper.setData({ dialog: true, options: { contractsCount: 10 } });

        await wrapper.find('#contractAddress').setValue('0x123');
        await wrapper.find('#importContract').trigger('click');

        await wrapper.vm.$nextTick();
        expect(wrapper.html()).toMatchSnapshot();
        done();
    });

    afterEach(async () => {
        await helper.clearFirebase();
    });    
});

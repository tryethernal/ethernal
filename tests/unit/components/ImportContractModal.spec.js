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
        await wrapper.setData({ dialog: true });

        await wrapper.find('#contractAddress').setValue('0x123');
        await wrapper.find('#importContract').trigger('click');

        await wrapper.vm.$nextTick();
        expect(importContractMock).toHaveBeenCalled();
        expect(wrapper.html()).toMatchSnapshot();
        done();
    });

    it('Should warn the user if the contract has not been found', async (done) => {
        helper.mocks.server.importContract = () => {
            return new Promise((_, reject) => reject({ message: 'Contract not found'}));
        };
        const wrapper = helper.mountFn(ImportContractModal);
        const importContractMock = jest.spyOn(helper.mocks.server, 'importContract');
        await wrapper.setData({ dialog: true });

        await wrapper.find('#contractAddress').setValue('0x123');
        await wrapper.find('#importContract').trigger('click');

        await wrapper.vm.$nextTick();
        expect(importContractMock).toHaveBeenCalled();
        expect(wrapper.html()).toMatchSnapshot();
        done();
    });    

    afterEach(async () => {
        await helper.clearFirebase();
    });    
});

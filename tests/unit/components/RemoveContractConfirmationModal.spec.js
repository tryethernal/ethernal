import MockHelper from '../MockHelper';
  
import RemoveContractConfirmationModal from '@/components/RemoveContractConfirmationModal.vue';

describe('RemoveContractConfirmationModal.vue', () => {
    let helper;

    beforeEach(() => {
        helper = new MockHelper();
    });

    it('Should display the modal', async (done) => {
        const wrapper = helper.mountFn(RemoveContractConfirmationModal);
        await wrapper.setData({ dialog: true, workspace: 'hardhat', address: '0x123' });
        expect(wrapper.html()).toMatchSnapshot();
        done();
    });

    it('Should display an error message if something is wrong', async (done) => {
        helper.mocks.server.removeContract = () => {
            return new Promise((_, reject) => reject({ message: 'There is an error'}));
        };
        const wrapper = helper.mountFn(RemoveContractConfirmationModal);
        await wrapper.setData({ dialog: true, workspace: 'hardhat', address: '0x123' });

        await wrapper.find('#removeContract').trigger('click');
        await wrapper.vm.$nextTick();
        expect(wrapper.html()).toMatchSnapshot();
        done();
    });

    it('Should call the removal function', async (done) => {
        const wrapper = helper.mountFn(RemoveContractConfirmationModal);
        await wrapper.setData({ dialog: true, workspace: 'hardhat', address: '0x123' });

        const removeContractSpy = jest.spyOn(helper.mocks.server, 'removeContract');

        await wrapper.find('#removeContract').trigger('click');
        await wrapper.vm.$nextTick();

        expect(removeContractSpy).toHaveBeenCalled();
        done();
    });

    afterEach(async () => {
        await helper.clearFirebase();
    });    
});

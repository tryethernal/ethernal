import RemoveContractConfirmationModal from '@/components/RemoveContractConfirmationModal.vue';

describe('RemoveContractConfirmationModal.vue', () => {
    it('Should display the modal', async () => {
        const wrapper = mount(RemoveContractConfirmationModal);
        await wrapper.setData({ dialog: true, workspace: 'hardhat', address: '0x123' });
        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should display an error message if something is wrong', async () => {
        vi.spyOn(server, 'removeContract').mockRejectedValue({ message: 'There is an error' });

        const wrapper = mount(RemoveContractConfirmationModal);
        await wrapper.setData({ dialog: true, workspace: 'hardhat', address: '0x123' });

        await wrapper.find('#removeContract').trigger('click');
        await wrapper.vm.$nextTick();

        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should call the removal function', async () => {
        vi.spyOn(server, 'removeContract').mockResolvedValue();
        const wrapper = mount(RemoveContractConfirmationModal);
        await wrapper.setData({ dialog: true, workspace: 'hardhat', address: '0x123' });

        const removeContractSpy = vi.spyOn(server, 'removeContract');

        await wrapper.find('#removeContract').trigger('click');
        await wrapper.vm.$nextTick();

        expect(removeContractSpy).toHaveBeenCalled();
    });
});

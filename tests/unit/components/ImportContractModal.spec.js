import ImportContractModal from '@/components/ImportContractModal.vue';

describe('ImportContractModal.vue', () => {
    it('Should let the user import a verified mainnet contract', async () => {
        const wrapper = mount(ImportContractModal);
        const importContractMock = vi.spyOn(server, 'importContract');
        await wrapper.setData({ dialog: true, options: { contractsCount: 1 } });

        await wrapper.find('#contractAddress').setValue('0x123');
        await wrapper.find('#importContract').trigger('click');

        await new Promise(process.nextTick);

        expect(importContractMock).toHaveBeenCalled();
        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should let the user import a non verified mainnet contract', async () => {
        vi.spyOn(server, 'importContract')
            .mockResolvedValue({ data: { success: true, contractIsVerified: false }});

        const wrapper = mount(ImportContractModal);
        const importContractMock = vi.spyOn(server, 'importContract');
        await wrapper.setData({ dialog: true, options: { contractsCount: 1 } });

        await wrapper.find('#contractAddress').setValue('0x123');
        await wrapper.find('#importContract').trigger('click');

        await new Promise(process.nextTick);

        expect(importContractMock).toHaveBeenCalled();
        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should warn the user if he is on a free plan and has already 10 contracts', async () => {
        const wrapper = mount(ImportContractModal);
        await wrapper.setData({ dialog: true, options: { contractsCount: 10 } });

        await wrapper.find('#contractAddress').setValue('0x123');
        await wrapper.find('#importContract').trigger('click');

        await new Promise(process.nextTick);
        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should not warn the user if he is on a premium plan and has already 10 contracts', async () => {
        const wrapper = mount(ImportContractModal, {
            global: {
                plugins: [createTestingPinia({
                    initialState: {
                        user: { plan: 'premium' }
                    }
                })]
            },
        });
        await wrapper.setData({ dialog: true, options: { contractsCount: 10 } });

        await wrapper.find('#contractAddress').setValue('0x123');
        await wrapper.find('#importContract').trigger('click');

        await new Promise(process.nextTick);
        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should not warn the user if he is on a public explorer', async () => {
        const wrapper = mount(ImportContractModal, {
            global: {
                plugins: [createTestingPinia({
                    initialState: {
                        user: { plan: 'free' },
                        currentWorkspace: { public: true }
                    }
                })]
            }
        });
        await wrapper.setData({ dialog: true, options: { contractsCount: 10 } });

        await wrapper.find('#contractAddress').setValue('0x123');
        await wrapper.find('#importContract').trigger('click');

        await new Promise(process.nextTick);
        expect(wrapper.html()).toMatchSnapshot();
    });
});

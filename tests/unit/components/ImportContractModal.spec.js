import MockHelper from '../MockHelper';
  
import ImportContractModal from '@/components/ImportContractModal.vue';

describe('ImportContractModal.vue', () => {
    let helper;

    beforeEach(() => {
        helper = new MockHelper();
    });

    it('Should let the user import a verified mainnet contract', async () => {
        const wrapper = helper.mountFn(ImportContractModal);
        const importContractMock = jest.spyOn(helper.mocks.server, 'importContract');
        await wrapper.setData({ dialog: true, options: { contractsCount: 1 } });

        await wrapper.find('#contractAddress').setValue('0x123');
        await wrapper.find('#importContract').trigger('click');

        await new Promise(process.nextTick);

        expect(importContractMock).toHaveBeenCalled();
        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should let the user import a non verified mainnet contract', async () => {
        jest.spyOn(helper.mocks.server, 'importContract')
            .mockResolvedValue({ data: { success: true, contractIsVerified: false }});

        const wrapper = helper.mountFn(ImportContractModal);
        const importContractMock = jest.spyOn(helper.mocks.server, 'importContract');
        await wrapper.setData({ dialog: true, options: { contractsCount: 1 } });

        await wrapper.find('#contractAddress').setValue('0x123');
        await wrapper.find('#importContract').trigger('click');

        await new Promise(process.nextTick);

        expect(importContractMock).toHaveBeenCalled();
        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should warn the user if he is on a free plan and has already 10 contracts', async () => {
        const wrapper = helper.mountFn(ImportContractModal);
        await wrapper.setData({ dialog: true, options: { contractsCount: 10 } });

        await wrapper.find('#contractAddress').setValue('0x123');
        await wrapper.find('#importContract').trigger('click');

        await new Promise(process.nextTick);
        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should not warn the user if he is on a premium plan and has already 10 contracts', async () => {
        const wrapper = helper.mountFn(ImportContractModal, {
            getters: {
                user: jest.fn().mockReturnValue({ plan: 'premium' })
            }
        });
        await wrapper.setData({ dialog: true, options: { contractsCount: 10 } });

        await wrapper.find('#contractAddress').setValue('0x123');
        await wrapper.find('#importContract').trigger('click');

        await new Promise(process.nextTick);
        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should not warn the user if he is on a public explorer', async () => {
        const wrapper = helper.mountFn(ImportContractModal, {
            getters: {
                user: jest.fn().mockReturnValue({ plan: 'free' }),
                currentWorkspace: jest.fn().mockReturnValue({ public: true })
            }
        });
        await wrapper.setData({ dialog: true, options: { contractsCount: 10 } });

        await wrapper.find('#contractAddress').setValue('0x123');
        await wrapper.find('#importContract').trigger('click');

        await new Promise(process.nextTick);
        expect(wrapper.html()).toMatchSnapshot();
    });
});

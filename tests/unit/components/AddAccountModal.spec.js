import MockHelper from '../MockHelper';

import AddAccountModal from '@/components/AddAccountModal.vue';
import flushPromises from 'flush-promises';

describe('AddAccountModal.vue', () => {
    let helper;

    beforeEach(async () => {
        helper = new MockHelper();
    });

    it('Should be able to add an account from a valid private key', async (done) => {
        const storeAccountPrivateKeyMock = jest.spyOn(helper.mocks.server, 'storeAccountPrivateKey');
        const wrapper = helper.mountFn(AddAccountModal);

        await wrapper.setData({ dialog: true });
        await wrapper.find('#privateKey').setValue('0x16030cd12895a091af129a98f8e4181002ff857edc24b7b6ab2d712e89b03c92');
        await wrapper.find('#submitAccount').trigger('click');

        await setTimeout(() => {
            expect(storeAccountPrivateKeyMock).toHaveBeenCalled();
            expect(wrapper.vm.loading).toBe(false);
        }, 1500);

        expect(wrapper.html()).toMatchSnapshot();
        done();
    });

    it('Should be able to add an account from an address', async (done) => {
        const impersonateAccountMock = jest.spyOn(helper.mocks.server, 'impersonateAccount');
        const wrapper = helper.mountFn(AddAccountModal);

        await wrapper.setData({ dialog: true });
        await wrapper.find('#accountAddress').setValue('0xBCd4ab34183d3Ff5d071E967d7832822dAA0d8C3');
        await wrapper.find('#submitAccount').trigger('click');

        await setTimeout(() => {
            expect(impersonateAccountMock).toHaveBeenCalled();
            expect(wrapper.vm.loading).toBe(false);
        }, 1500);

        expect(wrapper.html()).toMatchSnapshot();
        done();
    });

    it('Should display an error message if the private key has an invalid format', async (done) => {
        const wrapper = helper.mountFn(AddAccountModal);

        await wrapper.setData({ dialog: true });
        await wrapper.find('#privateKey').setValue('0x0');
        await wrapper.find('#submitAccount').trigger('click');

        await wrapper.vm.$nextTick();

        expect(wrapper.html()).toMatchSnapshot();

        done();
    });

    afterEach(async () => {
        await helper.clearFirebase();
    });
});

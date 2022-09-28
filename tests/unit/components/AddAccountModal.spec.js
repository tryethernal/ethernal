import flushPromises from 'flush-promises';
import MockHelper from '../MockHelper';

import AddAccountModal from '@/components/AddAccountModal.vue';

const helper = new MockHelper();

describe('AddAccountModal.vue', () => {
    beforeEach(() => jest.clearAllMocks());

    it('Should be able to add an account from a valid private key', async () => {
        const storeAccountPrivateKeyMock = jest.spyOn(helper.mocks.server, 'storeAccountPrivateKey')
            .mockResolvedValue({ success: true });
        const wrapper = helper.mountFn(AddAccountModal);

        await wrapper.setData({ dialog: true });
        await wrapper.find('#privateKey').setValue('0x16030cd12895a091af129a98f8e4181002ff857edc24b7b6ab2d712e89b03c92');
        await wrapper.find('#submitAccount').trigger('click');
        await flushPromises();

        expect(storeAccountPrivateKeyMock).toHaveBeenCalledTimes(1);
        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should be able to add an account from an address', async () => {
        const impersonateAccountMock = jest.spyOn(helper.mocks.server, 'impersonateAccount').mockResolvedValue(true);
        jest.spyOn(helper.mocks.server, 'getAccountBalance').mockResolvedValue('100000');

        const wrapper = helper.mountFn(AddAccountModal);

        await wrapper.setData({ dialog: true });
        await wrapper.find('#accountAddress').setValue('0xBCd4ab34183d3Ff5d071E967d7832822dAA0d8C3');
        await wrapper.find('#submitAccount').trigger('click');
        await flushPromises();

        expect(impersonateAccountMock).toHaveBeenCalledTimes(1);
        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should display an error message if the private key has an invalid format', async () => {
        const wrapper = helper.mountFn(AddAccountModal);

        await wrapper.setData({ dialog: true });
        await wrapper.find('#privateKey').setValue('0x0');
        await wrapper.find('#submitAccount').trigger('click');
        await flushPromises();

        expect(wrapper.html()).toMatchSnapshot();
    });
});

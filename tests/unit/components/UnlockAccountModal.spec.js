jest.mock('ethers', () => {
    return {
        Wallet: jest.fn(() => { return { address: '0x123' }})
    };
});
import ethers from 'ethers';
import MockHelper from '../MockHelper';

import UnlockAccountModal from '@/components/UnlockAccountModal.vue';

describe('UnlockAccountModal.vue', () => {
    let helper;

    beforeEach(async () => {
        helper = new MockHelper();        
    });

    it('Should let you unlock with a private key', async (done) => {
        const wrapper = helper.mountFn(UnlockAccountModal);

        await wrapper.setData({ options: { address: '0x123' }, dialog: true });
        await wrapper.find('#privateKey').setValue('0x456');
        await wrapper.find('#unlockAccount').trigger('click');
        await wrapper.vm.$nextTick();

        expect(wrapper.vm.successMessage).toBe('Account unlocked.')
        expect(wrapper.html()).toMatchSnapshot();

        done();
    });

    it('Should display a warning if address mismatch', async (done) => {
        ethers.Wallet.mockImplementation(() => { return { address: '0xabc' }});
        const wrapper = helper.mountFn(UnlockAccountModal);

        await wrapper.setData({ options: { address: '0x123' }, dialog: true });
        await wrapper.find('#privateKey').setValue('0x456');
        await wrapper.find('#unlockAccount').trigger('click');
        await wrapper.vm.$nextTick();

        expect(wrapper.vm.errorMessage).toBe(`Private key doesn't match the address.`);
        expect(wrapper.html()).toMatchSnapshot();

        done();
    });

    it('Should display a warning if private key format is incorrect', async (done) => {
        ethers.Wallet.mockImplementation(() => { throw { code: 'INVALID_ARGUMENT' }});
        const wrapper = helper.mountFn(UnlockAccountModal);

        await wrapper.setData({ options: { address: '0x123' }, dialog: true });
        await wrapper.find('#privateKey').setValue('ethernal');
        await wrapper.find('#unlockAccount').trigger('click');
        await wrapper.vm.$nextTick();

        expect(wrapper.vm.errorMessage).toBe(`Invalid private key.`);
        expect(wrapper.html()).toMatchSnapshot();

        done();
    });    

    afterEach(async () => {
        await helper.clearFirebase();
    });
});

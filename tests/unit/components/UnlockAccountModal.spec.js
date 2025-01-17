import * as ethers from 'ethers';

import UnlockAccountModal from '@/components/UnlockAccountModal.vue';

describe('UnlockAccountModal.vue', () => {
    it('Should let you unlock with a private key', async () => {
        vi.spyOn(ethers, 'Wallet').mockImplementation(() => { return { address: '0x123' }});
        const wrapper = mount(UnlockAccountModal);

        await wrapper.setData({ options: { address: '0x123' }, dialog: true });
        await wrapper.find('#privateKey').setValue('0x456');
        await wrapper.find('#unlockAccount').trigger('click');
        await new Promise(process.nextTick);

        expect(wrapper.vm.successMessage).toBe('Account unlocked.')
        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should display a warning if address mismatch', async () => {
        vi.spyOn(ethers, 'Wallet').mockImplementation(() => { return { address: '0xabc' }});
        const wrapper = mount(UnlockAccountModal);

        await wrapper.setData({ options: { address: '0x123' }, dialog: true });
        await wrapper.find('#privateKey').setValue('0x456');
        await wrapper.find('#unlockAccount').trigger('click');
        await new Promise(process.nextTick);

        expect(wrapper.vm.errorMessage).toBe(`Private key doesn't match the address.`);
        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should display a warning if private key format is incorrect', async () => {
        vi.spyOn(ethers, 'Wallet').mockImplementation(() => { throw { code: 'INVALID_ARGUMENT' }});
        const wrapper = mount(UnlockAccountModal);

        await wrapper.setData({ options: { address: '0x123' }, dialog: true });
        await wrapper.find('#privateKey').setValue('ethernal');
        await wrapper.find('#unlockAccount').trigger('click');
        await new Promise(process.nextTick);

        expect(wrapper.vm.errorMessage).toBe(`Invalid private key.`);
        expect(wrapper.html()).toMatchSnapshot();
    });
});

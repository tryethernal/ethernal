import MockHelper from '../MockHelper';
import flushPromises from 'flush-promises'

import Accounts from '@/components/Accounts.vue';

const helper = new MockHelper();

describe('Accounts.vue', () => {
    beforeEach(() => jest.clearAllMocks());

    it('Should load stored accounts & sync balances', async () => {
        jest.spyOn(helper.mocks.server, 'getRpcAccounts')
            .mockResolvedValue(['0x123']);
        jest.spyOn(helper.mocks.server, 'getAccounts')
            .mockResolvedValue({ data: { total: 1, items: [{ address: '0x123' }]}});
        jest.spyOn(helper.mocks.server, 'getAccountBalance')
            .mockResolvedValue('1000');
        
        const wrapper = helper.mountFn(Accounts, { stubs: ['Hash-Link'] });
        await flushPromises();
        
        expect(wrapper.vm.accounts.length).toEqual(1);
        expect(wrapper.vm.accounts[0]).toEqual({ address: '0x123', balance: '1000' });
    });

    it('Should resync all accounts when clicking on the "Resync" button', async () => {
        jest.spyOn(helper.mocks.server, 'getAccounts')
            .mockResolvedValue({ data: { total: 1, items: [{ address: '0x123' }]}});
        const getRpcAccountsMock = jest.spyOn(helper.mocks.server, 'getRpcAccounts')
            .mockResolvedValue(['0x123']);
        const getAccountBalanceMock = jest.spyOn(helper.mocks.server, 'getAccountBalance')
            .mockResolvedValue('1000');

        const wrapper = helper.mountFn(Accounts, { stubs: ['Hash-Link'] });
        await wrapper.find('#resyncAllAccounts').trigger('click');

        await setTimeout(() => {
            expect(getRpcAccountsMock).toHaveBeenCalledTimes(1);
            expect(getAccountBalanceMock).toHaveBeenCalledTimes(2);
        }, 2000);
    });

    it('Should load accounts if none are stored', async () => {
        jest.spyOn(helper.mocks.server, 'getAccounts')
            .mockResolvedValue({ data: { total: 0, items: []}});
        const getRpcAccountsMock = jest.spyOn(helper.mocks.server, 'getRpcAccounts')
            .mockResolvedValue(['0x123']);
        jest.spyOn(helper.mocks.server, 'getAccountBalance')
            .mockResolvedValue('1000');

        const wrapper = helper.mountFn(Accounts, { stubs: ['Hash-Link'] });
        await flushPromises();

        expect(wrapper.vm.accounts.length).toEqual(1);
        expect(wrapper.vm.accounts[0]).toEqual({ address: '0x123', balance: '1000' });
        expect(getRpcAccountsMock).toHaveBeenCalledTimes(1);
    });
});

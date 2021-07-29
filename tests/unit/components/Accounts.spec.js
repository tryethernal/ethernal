import MockHelper from '../MockHelper';

import Accounts from '@/components/Accounts.vue';

describe('Account.vue', () => {
    let helper, db;

    beforeEach(async () => {
        helper = new MockHelper();
        db = helper.mocks.db;
        await db.collection('accounts').doc('0x1234').set({ address: '0x1234', balance: 1234 });
        await db.collection('accounts').doc('0x1235').set({ address: '0x1235', balance: 1234, privateKey: '1234' });
    });

    it('Should load stored accounts & sync balances', async (done) => {
        const mockSyncAccount = jest.spyOn(Accounts.methods, 'syncAccount');
        
        const wrapper = helper.mountFn(Accounts);

        // No idea how to wait for execution of promises returned by mounted fn;
        // It is just a $bind, no network request, so 1s should always be enough
        setTimeout(() => {
            expect(wrapper.vm.accounts.length).toBe(2);
            expect(mockSyncAccount.mock.calls.length).toBe(2);
            done();
        }, 1000);
    });

    it('Should resyncs all accounts when clicking on the "Resync" button', async (done) => {
        const mockSyncAll = jest.spyOn(Accounts.methods, 'syncAll');
        const mockSyncAccount = jest.spyOn(Accounts.methods, 'syncAccount');

        const wrapper = helper.mountFn(Accounts);
        await wrapper.vm.$nextTick();

        await wrapper.find('#resyncAllAccounts').trigger('click');
        await wrapper.vm.$nextTick();
        expect(mockSyncAccount.mock.calls.length).toBe(2);

        done();
    });

    it('Should sync the balance when syncing account', async (done) => {
        const mockSyncBalance = jest.spyOn(helper.mocks.server, 'syncBalance');
        const wrapper = helper.mountFn(Accounts);
        await wrapper.vm.$nextTick();

        wrapper.vm.syncAccount('0x1234');

        await wrapper.vm.$nextTick();

        expect(mockSyncBalance).toHaveBeenCalled();

        done();
    });

    afterEach(async () => {
        await helper.clearFirebase();
    });
});

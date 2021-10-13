import MockHelper from '../MockHelper';

import Transactions from '@/components/Transactions.vue';

describe('Transactions.vue', () => {
    let helper;

    beforeEach(async () => {
        helper = new MockHelper();
        const db = helper.mocks.admin;
        const transaction1 = {
            hash: '0x060034486a819816df57d01eefccbe161d7019f9f3c235e18af07468fb194ef0',
            timestamp: '1621548462',
            from: '0x0',
            to: 'Ox1',
            blockNumber: 1,
            value: '0'
        };

        const transaction2 = {
            hash: '0x1234',
            timestamp: '1621548462',
            from: '0x0',
            to: 'Ox1',
            blockNumber: 1,
            value: '0'
        };        

        await db.collection('transactions')
            .doc(transaction1.hash)
            .set(transaction1);

        await db.collection('transactions')
            .doc(transaction2.hash)
            .set(transaction2);            
    });

    it('Should display the list', async (done) => {
        const wrapper = helper.mountFn(Transactions)

        setTimeout(() => {
            expect(wrapper.html()).toMatchSnapshot();
            done();
        }, 1000);
    });

    afterEach(async () => {
        await helper.clearFirebase();
    });
});

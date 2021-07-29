import MockHelper from '../MockHelper';

import Transaction from '@/components/Transaction.vue';

describe('Transaction.vue', () => {
    let helper;

    beforeEach(async () => {
        helper = new MockHelper();
        const db = helper.mocks.db;
        const blockData = {
            number: '1',
            gasLimit: '1000000000',
            timestamp: '1621548462',
            hash: '0x98c6edb3bb1124680a97661c1f5794d60617abb57bd1e611d81fc5b941f36d30'
        };
        const transactionData = {
            hash: '0x060034486a819816df57d01eefccbe161d7019f9f3c235e18af07468fb194ef0',
            timestamp: '1621548462',
            from: '0x0',
            to: 'Ox1',
            blockNumber: 1,
            value: '0',
            gasPrice: 123,
            receipt: {
                gasUsed: 10000000
            },
            trace: []
        };

        await db.collection('blocks')
            .doc(blockData.number)
            .set(blockData);

        await db.collection('transactions')
            .doc(transactionData.hash)
            .set(transactionData);
    });

    it('Should display the transaction', async (done) => {
        const wrapper = helper.mountFn(Transaction, {
            propsData: {
                hash: '0x060034486a819816df57d01eefccbe161d7019f9f3c235e18af07468fb194ef0'
            }
        });
        setTimeout(() => {
            expect(wrapper.html()).toMatchSnapshot();
            done();
        }, 1000);        
    });

    afterEach(async () => {
        await helper.clearFirebase();
    });
});

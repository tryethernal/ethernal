import MockHelper from '../MockHelper';

import AddressTransactionsList from '@/components/AddressTransactionsList.vue';

describe('AddressTransactionsList.vue', () => {
    let helper, address, transactions = [], db;

    beforeEach(async () => {
        helper = new MockHelper();
        db = helper.mocks.admin;
        const promises = [];
        for (let i = 1; i <= 5; i++) {
            const transaction = {
                hash: `0x${i}`,
                timestamp: '1621548462',
                from: '0x1',
                to: '0x0',
                blockNumber: i,
                value: '0',
                data: '0xa9059cbb000000000000000000000000c00e94cb662c3520282e6f5717214004a7f268880000000000000000000000000000000000000000000000000000000000000001'
            };
            promises.push(db.collection('transactions').doc(transaction.hash).set(transaction));
        }

        for (let i = 6; i <= 10; i++) {
            const transaction = {
                hash: `0x${i}`,
                timestamp: '1621548462',
                from: '0x0',
                to: '0x1',
                blockNumber: i,
                value: '0',
                data: '0xa9059cbb000000000000000000000000c00e94cb662c3520282e6f5717214004a7f268880000000000000000000000000000000000000000000000000000000000000001'
            };
            promises.push(db.collection('transactions').doc(transaction.hash).set(transaction));
        }

        for (let i = 11; i <= 15; i++) {
            const transaction = {
                hash: `0x${i}`,
                timestamp: '1621548462',
                from: '0x1',
                to: '0x0',
                blockNumber: i,
                value: '0',
                data: '0xa9059cbb000000000000000000000000c00e94cb662c3520282e6f5717214004a7f268880000000000000000000000000000000000000000000000000000000000000001'
            };
            promises.push(db.collection('transactions').doc(transaction.hash).set(transaction));
        }
        await Promise.all(promises);
    });

    it('Should display the list', async (done) => {
        const wrapper = helper.mountFn(AddressTransactionsList, {
            propsData: {
                address: '0x0'
            }
        })

        setTimeout(() => {
            expect(wrapper.html()).toMatchSnapshot();
            done();
        }, 1000);
    });

    afterEach(async () => {
        await helper.clearFirebase();
    });
});

const ethers = require('ethers');
import MockHelper from '../MockHelper';

import Transaction from '@/components/Transaction.vue';
import USDCTransferTx from '../fixtures/USDCTransferTx.json';
import ERC20ABI from '@/abis/erc20';

describe('Transaction.vue', () => {
    let helper;

    beforeEach(async () => {
        helper = new MockHelper();
        const db = helper.mocks.admin;
        const blockData = {
            number: '13012562',
            gasLimit: '1000000000',
            timestamp: '1621548462',
            hash: '0x550de1fa682ce3548be575f4db1754d594b094808f301a2d4f11c52546bb20bf'
        };

        await db.collection('blocks')
            .doc(blockData.number)
            .set(blockData);

        await db.collection('transactions')
            .doc(USDCTransferTx.hash)
            .set(USDCTransferTx);

        await db.collection('contracts')
            .doc(USDCTransferTx.to)
            .set({
                address: USDCTransferTx.to,
                name: 'USDC',
                token: { name: 'USD Coin', symbol: 'USDC', decimals: 6 },
                abi: ERC20ABI
            });

        for (let i = 0; i < 2; i++)
            helper.mocks.server.callContractReadMethod
                .mockImplementationOnce(() => new Promise((resolve) => resolve([ethers.BigNumber.from('100000000000000000000')])))
                .mockImplementationOnce(() => new Promise((resolve) => resolve([ethers.BigNumber.from('1000000000000000000')])))
    });

    it('Should display the transaction', async (done) => {
        const wrapper = helper.mountFn(Transaction, {
            propsData: {
                hash: '0x05d709954d59bfaa43bcf629b0a415d30e56ab1400d96dc7bd0ed1664a702759'
            }
        });
        setTimeout(() => {
            expect(wrapper.html()).toMatchSnapshot();
            done();
        }, 1000);
    });

    it('Should display infos properly with proxy contracts', async (done) => {
        const db = helper.mocks.admin;
        await db.collection('contracts')
            .doc(USDCTransferTx.to)
            .set({
                address: USDCTransferTx.to,
                proxy: '0x1234abcdef',
                token: { name: 'USD Coin', symbol: 'USDC', decimals: 6 }
            });

        await db.collection('contracts')
            .doc('0x1234abcdef')
            .set({
                address: '0x1234abcdef',
                name: 'USDC',
                abi: ERC20ABI
            });

        const wrapper = helper.mountFn(Transaction, {
            propsData: {
                hash: '0x05d709954d59bfaa43bcf629b0a415d30e56ab1400d96dc7bd0ed1664a702759'
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

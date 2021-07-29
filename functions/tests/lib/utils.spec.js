const ethers = require('ethers');
const {
    sanitize,
    stringifyBns,
    getFunctionSignatureForTransaction,
    getTxSynced
} = require('../../lib/utils');
const Helper = require('../helper');
const Transaction = require('../fixtures/Transaction.json');
const TransactionReceipt = require('../fixtures/TransactionReceipt.json');
const ABI = require('../fixtures/ABI.json');

describe('sanitize', () => {
    it('Should clear null keys', () => {
        const obj = {
            a: 1,
            b: null,
        };
        expect(sanitize(obj)).toEqual({ a: 1 });
    });

    it('Should only lowercase addresses', () => {
        const obj = {
            a: 'Not An Address',
            b: '0xAd0cf4FE440AdA22AaCf5c2f763D9ab481174BbD'
        }
        expect(sanitize(obj)).toEqual({
            a: 'Not An Address',
            b: '0xad0cf4fe440ada22aacf5c2f763d9ab481174bbd'
        });
    })
});

describe('stringifyBns', () => {
    it('Should convert BN in strings in an object', () => {
        const obj = {
            a: 123,
            b: '1234',
            c: ethers.BigNumber.from('123456')
        };
        expect(stringifyBns(obj)).toEqual({
            a: 123,
            b: '1234',
            c: '123456'
        });
    });

    it('Should remove functions', () => {
       const obj = {
            a: 123,
            b: '1234',
            c: ethers.BigNumber.from('123456'),
            d: () => 'Hi'
        };
        expect(stringifyBns(obj)).toEqual({
            a: 123,
            b: '1234',
            c: '123456'
        });
    });
});

describe('getFunctionSignatureForTransaction', () => {
    it('Should return a signature from a transaction & ABI', () => {
        expect(getFunctionSignatureForTransaction(Transaction, ABI)).toEqual('transfer(address dst, uint256 rawAmount)');
    });
});

describe('getTxSynced', () => {
    it('Should return a storable transaction object', async () => {
        const helper = new Helper(process.env.GCLOUD_PROJECT);
        await helper.workspace
            .collection('contracts')
            .doc(Transaction.to)
            .set({ address: Transaction.to, abi: ABI });

        const result = await getTxSynced('123', 'hardhat', Transaction, TransactionReceipt, '1627491540328');

        expect(result).toMatchSnapshot();
    });
});
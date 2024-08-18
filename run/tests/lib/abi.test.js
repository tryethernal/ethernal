const { getV2PoolReserves, decodeLog, getTokenTransfer, getTransactionMethodDetails, findAbiForFunction } = require('../../lib/abi.js');
const ERC_20_ABI = require('../../lib/abis/erc20.json');
const ERC_721_ABI = require('../../lib/abis/erc721.json');
const ABIProp = require('../fixtures/ABIProp.json');
const LogProp = require('../fixtures/LogProp.json');
const DSProxyContract = require('../fixtures/DSProxyContract.json');
const ERC721TransferReceipt = require('../fixtures/ERC721TransferReceipt.json');
const LogNoteEventProp = require('../fixtures/LogNoteEventProp.json');
const TransactionReceipt = require('../fixtures/TransactionReceipt.json');
const AmalfiDepositTransaction = require('../fixtures/AmalfiDepositTransaction.json');
const AmalfiContract = require('../fixtures/AmalfiContract.json');
const TransactionTransfer = require('../fixtures/TransactionTransfer.json');
const SyncEvent = require('../fixtures/SyncEvent.json');

describe('getV2PoolReserves', () => {
    it('Should return the reserves', () => {
        expect(getV2PoolReserves(SyncEvent)).toEqual({ reserve0: '999671367819237062401644', reserve1: '20247201855330962943989954' });
    });
});

describe('findAbiForFunction', () => {
    it('Should return erc721 abi if the signature matches one of its function', () => {
        expect(findAbiForFunction('0xe985e9c5')).toEqual(ERC_721_ABI);
    });

    it('Should return erc20 abi if the signature matches one of its function', () => {
        expect(findAbiForFunction('0x18160ddd')).toEqual(ERC_20_ABI);
    });

    it('Should not return anything if it does not match', () => {
        expect(findAbiForFunction('0x1')).toEqual(undefined);
    });
});

describe('decodeLog', () => {
    it('Should decode the event if it is not anonymous', () => {
        expect(decodeLog(LogProp, ABIProp)).toMatchSnapshot();
    });

    it('Should decode the event if it is anonymous', () => {
        expect(decodeLog(LogNoteEventProp, DSProxyContract.abi)).toMatchSnapshot();
    });
});

describe('getTokenTransfer', () => {
    it('Should return decoded erc721 transfer', () => {
        expect(getTokenTransfer(ERC721TransferReceipt.logs[1])).toMatchSnapshot();
    });

    it('Should return decoded erc20 transfer', () => {
        expect(getTokenTransfer(TransactionReceipt.logs[0])).toMatchSnapshot();
    });

    it('Should return null', () => {
        expect(getTokenTransfer(AmalfiDepositTransaction.receipt.logs[0])).toEqual(null);
    });
});

describe('getTransactionMethodDetails', () => {
    it('Should return erc20 abi if the tx called one', () => {
        expect(getTransactionMethodDetails(TransactionTransfer)).toEqual({
            label: `transfer(\n\taddress dst: 0x0f71271b3611f99B6867B95eDA4d203F0a913972,\n\tuint256 rawAmount: 2274999999652000020000\n)`,
            name: 'transfer',
            signature: 'transfer(address dst, uint256 rawAmount)'
        });
    });

    it('Should return an object with formatted data about the tx', () => {
        expect(getTransactionMethodDetails(AmalfiDepositTransaction, AmalfiContract.artifact.abi)).toEqual({
            label: 'deposit(address payee: 0x1291Be112d480055DaFd8a610b7d1e203891C274)',
            name: 'deposit',
            signature: 'deposit(address payee)'
        });
    });
});
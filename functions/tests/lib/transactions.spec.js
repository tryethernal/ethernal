const Helper = require('../helper');
const { processTransactions} = require('../../lib/transactions');
const AmalfiContract = require('../fixtures/AmalfiContract.json');
const TokenAbi = require('../fixtures/ABI.json');
const Transaction = {"blockHash":"0x50b10286540941286570588a16a59cc73fac0f2d8213ad49e6614d1985fd6d82","data":"0xba118f6300000000000000000000000063606c22157476da3b26ad1c2eae573d0387d7330000000000000000000000000000000000000000000000000000000065a55d7d","accessList":[],"transactionIndex":0,"confirmations":1,"type":2,"nonce":2,"gasLimit":"6721975","r":"0x22ab3ac486de70bfe6735bae92a38e18a37bbfbe09a5facc1c8bb48967a802ee","s":"0x6ad0bebea8f80ff739a6cf9f75c057292ee2e29ded602734e5d496bd063797e3","chainId":31337,"v":1,"blockNumber":14008967,"from":"0x2d481eeb2ba97955cd081cf218f453a817259ab1","receipt":{"blockHash":"0x50b10286540941286570588a16a59cc73fac0f2d8213ad49e6614d1985fd6d82","logsBloom":"0x00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000","transactionIndex":0,"confirmations":1,"transactionHash":"0xaa82e74b71fb20503205beaffb60a38b08c6766a66dae1477b479df0e05f1bbe","gasUsed":"46419","blockNumber":14008967,"cumulativeGasUsed":"46419","from":"0x2d481eeb2ba97955cd081cf218f453a817259ab1","to":"0x63606c22157476da3b26ad1c2eae573d0387d733","logs":[],"byzantium":true,"status":1},"to":"0x63606c22157476da3b26ad1c2eae573d0387d733","value":"0","hash":"0xaa82e74b71fb20503205beaffb60a38b08c6766a66dae1477b479df0e05f1bbe","gasPrice":"76869329841","timestamp":1642264024,"methodDetails":{"signature":"setMaturity(address payee, uint256 maturity)","name":"setMaturity","label":"setMaturity(\n\taddress payee: 0x63606C22157476Da3B26Ad1c2EAE573D0387D733,\n\tuint256 maturity: 1705336189\n)"}};
let helper;

describe('processTransactions ', () => {
    beforeEach(async () => {
        helper = new Helper(process.env.GCLOUD_PROJECT);
        await helper.setUser();
    });

    it('Should get contract data from to, get proxy data, store transaction details & store token transfers ', async () => {
        await helper.workspace
            .collection('contracts')
            .doc(Transaction.to)
            .set({ abi: AmalfiContract.artifact.abi });

        await processTransactions('123', 'hardhat', [Transaction])

        const transactionRef = await helper.workspace
            .collection('transactions')
            .doc(Transaction.hash)
            .get();

        expect(transactionRef.data().methodDetails).toMatchSnapshot();
    });

    it('Should store empty transaction details & store token transfers when no to', async () => {
        await helper.workspace
            .collection('contracts')
            .doc(Transaction.to)
            .set({ abi: TokenAbi });

        await helper.workspace
            .collection('transactions')
            .doc(Transaction.to)
            .set(Transaction);

        await processTransactions('123', 'hardhat', [Transaction])
    });

    it('Should store empty transaction details & store token transfers when no contracts @to', async () => {
        await processTransactions('123', 'hardhat', [{ ...Transaction, to: null }])
    });

    it('Should store empty transactions token transfers if no transfers', async () => {
        await processTransactions('123', 'hardhat', [Transaction])
    });

    afterEach(() => helper.clean());
});

const ethers = require('ethers');
const { getContractData, storeTransactionMethodDetails, storeTransactionTokenTransfers } = require('./firebase');
const { getFunctionSignatureForTransaction } = require('./utils');
const { getTokenTransfers, getTransactionMethodDetails } = require('./abi');
const ERC20_ABI = require('./abis/erc20.json');

exports.processTransactions = async (userId, workspace, transactions) => {
    for (let i = 0; i < transactions.length; i++) {
        let contract;
        const transaction = transactions[i];

        if (transaction.to)
            contract = await getContractData(userId, workspace, transaction.to);

        if (contract && contract.proxy)
            contract = await getContractData(userId, workspace, contract.proxy);

        const abi = contract && contract.abi ? contract.abi : ERC20_ABI;

        try {
            const transactionMethodDetails = getTransactionMethodDetails(transaction, abi);
            await storeTransactionMethodDetails(userId, workspace, transaction.hash, transactionMethodDetails);
        } catch(error) {
            console.log(error)
            await storeTransactionMethodDetails(userId, workspace, transaction.hash, null);
        }

        try {
            const tokenTransfers = getTokenTransfers(transaction, abi);
            await storeTransactionTokenTransfers(userId, workspace, transaction.hash, tokenTransfers);
        } catch(error) {
            console.log(error)
            await storeTransactionTokenTransfers(userId, workspace, transaction.hash, []);
        }
    }
};

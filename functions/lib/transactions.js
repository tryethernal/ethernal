const ethers = require('ethers');
const { getContractData, storeTransactionMethodDetails, storeTransactionTokenTransfers } = require('./firebase');
const { getFunctionSignatureForTransaction } = require('./utils');
const { getTokenTransfers, getTransactionMethodDetails } = require('./abi');
const Rpc = require('./rpc');

const getBalanceChange = async (address, token, blockNumber, rpcServer) => {
    let currentBalance = ethers.BigNumber.from('0');
    let previousBalance = ethers.BigNumber.from('0');
    const rpc = new Rpc(rpcServer);
    const abi = ['function balanceOf(address owner) view returns (uint256)'];

    try {
        const options = {
            from: null,
            blockTag: blockNumber
        };

        const res = await rpc.callContractReadMethod(token, abi, 'balanceOf(address)', { 0: address });
        currentBalance = res[0];
    } catch(error) {
        console.log(error);
    }

    if (block > 1) {
        try {
            const options = {
                from: null,
                blockTag: Math.max(1, parseInt(block) - 1)
            };

            const res = await rpc.callContractReadMethod(token, abi)
        }  catch(error) {
            console.log(error);
        }
    }
    
};

exports.processTransactions = async (userId, workspace, transactions) => {
    for (let i = 0; i < transactions.length; i++) {
        let contract, tokenTransfers;
        const transaction = transactions[i];

        if (transaction.to)
            contract = await getContractData(userId, workspace, transaction.to);

        if (contract && contract.proxy)
            contract = await getContractData(userId, workspace, contract.proxy);

        if (contract && contract.abi) {
            try {
                const transactionMethodDetails = getTransactionMethodDetails(transaction, contract.abi);
                await storeTransactionMethodDetails(userId, workspace, transaction.hash, transactionMethodDetails);
            } catch(error) {
                console.log(error)
                await storeTransactionMethodDetails(userId, workspace, transaction.hash, null);
            }
        }
        else
            await storeTransactionMethodDetails(userId, workspace, transaction.hash, null);

        try {
            tokenTransfers = getTokenTransfers(transaction);
            await storeTransactionTokenTransfers(userId, workspace, transaction.hash, tokenTransfers);
        } catch(error) {
            console.log(error)
            await storeTransactionTokenTransfers(userId, workspace, transaction.hash, []);
        }

        if (tokenTransfers) {
            const workspace = await getWorkspace(userId, workspace);
            if (workspace.public) {
                const tokenBalanceChanges = {};
                for (let i = 0; i < tokenTransfers.length; i++) {
                    const transfer = tokenTransfers[i];
                    tokenBalanceChanges[transfer.token] = [];
                    if (transfer.src != '0x0000000000000000000000000000000000000000')
                        tokenBalanceChanges[transfer.token].push(await getBalanceChange(transfer.src, transfer.token, transaction.blockNumber, workspace.rpcServer));
                    if (transfer.dst != '0x0000000000000000000000000000000000000000')
                        tokenBalanceChanges[transfer.token].push(await getBalanceChange(transfer.dst, transfer.token, transaction.blockNumber, workspace.rpcServer))
                }

                await storeTokenBalanceChanges(userId, workspace.name, transaction, tokenBalanceChanges);
            }
        }
    }
};

const ethers = require('ethers');
let { getContractData, storeTransactionMethodDetails, storeTransactionTokenTransfers, getWorkspaceByName, storeTokenBalanceChanges } = require('./firebase');
const { getFunctionSignatureForTransaction } = require('./utils');
let { getTokenTransfers, getTransactionMethodDetails } = require('./abi');
const { ContractConnector } = require('./rpc');

let getBalanceChange = async (address, token, blockNumber, rpcServer) => {
    let currentBalance = ethers.BigNumber.from('0');
    let previousBalance = ethers.BigNumber.from('0');
    const abi = ['function balanceOf(address owner) view returns (uint256)'];
    const contract = new ContractConnector(rpcServer, token, abi);

    try {
        const options = {
            from: null,
            blockTag: blockNumber
        };

        const res = await contract.callReadMethod('balanceOf(address)', { 0: address }, options);
        if (ethers.BigNumber.isBigNumber(res[0]))
            currentBalance = res[0];
        else
            throw 'Not a big number result'
    } catch(error) {
        return null;
    }

    if (blockNumber > 1) {
        try {
            const options = {
                from: null,
                blockTag: Math.max(1, parseInt(blockNumber) - 1)
            };

            const res = await contract.callReadMethod('balanceOf(address)', { 0: address }, options);
            if (ethers.BigNumber.isBigNumber(res[0]))
                previousBalance = res[0];
            else
                throw 'Not a big number result'
        }  catch(error) {
            return null;
        }
    }

    return {
        address: address,
        currentBalance: currentBalance.toString(),
        previousBalance: previousBalance.toString(),
        diff: currentBalance.sub(previousBalance).toString()
    };
}

exports.processTransactions = async (userId, workspaceName, transactions) => {
    for (let i = 0; i < transactions.length; i++) {
        let contract, tokenTransfers;
        const transaction = transactions[i];

        if (transaction.to)
            contract = await getContractData(userId, workspaceName, transaction.to);

        if (contract && contract.proxy)
            contract = await getContractData(userId, workspaceName, contract.proxy);

        if (contract && contract.abi) {
            try {
                const transactionMethodDetails = getTransactionMethodDetails(transaction, contract.abi);
                await storeTransactionMethodDetails(userId, workspaceName, transaction.hash, transactionMethodDetails);
            } catch(error) {
                console.log(error)
                await storeTransactionMethodDetails(userId, workspaceName, transaction.hash, null);
            }
        }
        else
            await storeTransactionMethodDetails(userId, workspaceName, transaction.hash, null);

        try {
            tokenTransfers = getTokenTransfers(transaction);
            await storeTransactionTokenTransfers(userId, workspaceName, transaction.hash, tokenTransfers);
        } catch(error) {
            console.log(error)
            await storeTransactionTokenTransfers(userId, workspaceName, transaction.hash, []);
        }

        if (tokenTransfers) {
            const workspace = await getWorkspaceByName(userId, workspaceName);
            if (workspace.public) {
                const tokenBalanceChanges = {};
                for (let i = 0; i < tokenTransfers.length; i++) {
                    const transfer = tokenTransfers[i];
                    const changes = [];
                    if (transfer.src != '0x0000000000000000000000000000000000000000') {
                        const balanceChange = await getBalanceChange(transfer.src, transfer.token, transaction.blockNumber, workspace.rpcServer);
                        if (balanceChange)
                            changes.push(balanceChange);
                    }
                    if (transfer.dst != '0x0000000000000000000000000000000000000000') {
                        const balanceChange = await getBalanceChange(transfer.dst, transfer.token, transaction.blockNumber, workspace.rpcServer);
                        if (balanceChange)
                            changes.push(balanceChange);
                    }

                    if (changes.length > 0)
                        tokenBalanceChanges[transfer.token] = changes;
                }

                if (Object.keys(tokenBalanceChanges).length)
                    await storeTokenBalanceChanges(userId, workspace.name, transaction.hash, tokenBalanceChanges);
            }
        }
    }
};

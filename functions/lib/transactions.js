const ethers = require('ethers');
const { getContractData, storeTransactionSignature } = require('./firebase');
const { getFunctionSignatureForTransaction } = require('./utils');

exports.processTransactions = async (userId, workspace, transactions) => {
    for (let i = 0; i < transactions.length; i++) {
        const transaction = transactions[i];
        const contract = await getContractData(userId, workspace, transaction.to)

        if (!contract || !contract.abi) continue;

        const jsonInterface = new ethers.utils.Interface(contract.abi);
        const parsedTransactionData = jsonInterface.parseTransaction(transaction);

        const label = [`${parsedTransactionData.functionFragment.name}(`];
        const inputsLabel = [];
        for (let i = 0; i < parsedTransactionData.functionFragment.inputs.length; i ++) {
            const input = parsedTransactionData.functionFragment.inputs[i];
            const param = [];
            param.push(input.type)
            if (input.name)
                param.push(` ${input.name}`);
            if (parsedTransactionData.args[i])
                param.push(`: ${parsedTransactionData.args[i]}`)
            inputsLabel.push(param.join(''));
        }

        if (inputsLabel.length > 1)
            label.push('\n\t');

        label.push(inputsLabel.join(',\n\t'));

        if (inputsLabel.length > 1)
            label.push('\n');

        label.push(')');

        await storeTransactionSignature(userId, workspace, transaction.hash, {
            name: parsedTransactionData.name,
            label: label.join(''),
            sighash: parsedTransactionData.sighash
        });
    }
};
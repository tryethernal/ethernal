const ethers = require('ethers');
const { getContractData, storeTransactionMethodDetails } = require('./firebase');
const { getFunctionSignatureForTransaction } = require('./utils');

exports.processTransactions = async (userId, workspace, transactions) => {
    for (let i = 0; i < transactions.length; i++) {
        try {
            const transaction = transactions[i];

            if (!transaction.to) continue;

            const contract = await getContractData(userId, workspace, transaction.to);

            if (!contract || !contract.abi) continue;

            const jsonInterface = new ethers.utils.Interface(contract.abi);
            const parsedTransactionData = jsonInterface.parseTransaction({ data: transaction.data, value: transaction.value });
            const fragment = parsedTransactionData.functionFragment;

            const label = [`${fragment.name}(`];
            const inputsLabel = [];
            for (let i = 0; i < fragment.inputs.length; i ++) {
                const input = fragment.inputs[i];
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

            const signature = `${fragment.name}(` + fragment.inputs.map((input) => `${input.type} ${input.name}`).join(', ') + ')'

            await storeTransactionMethodDetails(userId, workspace, transaction.hash, {
                name: parsedTransactionData.name,
                label: label.join(''),
                signature: signature
            });
        } catch(error) {
            console.log(error)
            continue;
        }
    }
};

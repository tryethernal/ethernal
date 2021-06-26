const ethers = require('ethers');
const { getContractData } = require('./firebase');

const _sanitize = (obj) => {
    return Object.fromEntries(
        Object.entries(obj)
            .filter(([_, v]) => v != null)
            .map(([_, v]) => typeof v == 'string' ? [_, v.toLowerCase()] : [_, v])
    );
};

const _stringifyBns = (obj) => {
    var res = {}
    for (const key in obj) {
        if (ethers.BigNumber.isBigNumber(obj[key])) {
            res[key] = ethers.BigNumber.from(obj[key]).toString();
        }
        else if (typeof obj[key] !== 'function') {
            res[key] = obj[key];
        }
    }
    return res;
};

const _getFunctionSignatureForTransaction = (transaction, abi) => {
    if (!transaction || !abi)
        return null;

    var jsonInterface = new ethers.utils.Interface(abi);

    var parsedTransactionData = jsonInterface.parseTransaction(transaction);
    var fragment = parsedTransactionData.functionFragment;

    return `${fragment.name}(` + fragment.inputs.map((input) => `${input.type} ${input.name}`).join(', ') + ')'
};

module.exports = {
    sanitize: _sanitize,
    stringifyBns: _stringifyBns,
    getFunctionSignatureForTransaction: _getFunctionSignatureForTransaction,
    getTxSynced: (uid, workspace, transaction, receipt, timestamp) => {
        const sTransactionReceipt = receipt ? _stringifyBns(_sanitize(receipt)) : null;
        const sTransaction = _stringifyBns(_sanitize(transaction));

        const contractAbi = sTransactionReceipt && sTransactionReceipt.contractAddress ? getContractData(uid, workspace, sTransactionReceipt.contractAddress) : null;

        return _sanitize({
           ...sTransaction,
            receipt: sTransactionReceipt,
            timestamp: timestamp,
            functionSignature: contractAbi ? _getFunctionSignatureForTransaction(transaction, contractAbi) : null
        });
    }
}

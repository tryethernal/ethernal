const ethers = require('ethers');
const { getContractData } = require('./firebase');

const _isJson = function(obj) {
    try {
        JSON.parse(obj);
        return true;
    } catch(e) {
        return false;
    }
};

const _sanitize = (obj) => {
    return Object.fromEntries(
        Object.entries(obj)
            .filter(([_, v]) => v != null)
            .map(([_, v]) => {
                if (typeof v == 'string' && v.length == 42 && v.startsWith('0x'))
                    return [_, v.toLowerCase()];
                else
                    return [_, v];
            })
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
    try {
        if (!transaction || !abi)
            return null;

        var jsonInterface = new ethers.utils.Interface(abi);

        var parsedTransactionData = jsonInterface.parseTransaction(transaction);
        var fragment = parsedTransactionData.functionFragment;

        return `${fragment.name}(` + fragment.inputs.map((input) => `${input.type} ${input.name}`).join(', ') + ')'
    } catch(error) {
        if (error.code == 'INVALID_ARGUMENT')
            return '';
    }
};

module.exports = {
    sanitize: _sanitize,
    stringifyBns: _stringifyBns,
    getFunctionSignatureForTransaction: _getFunctionSignatureForTransaction,
    getTxSynced: async (uid, workspace, transaction, receipt, timestamp) => {
        const sTransactionReceipt = receipt ? _stringifyBns(_sanitize(receipt)) : null;
        const sTransaction = _stringifyBns(_sanitize(transaction));

        let contractAbi = null;
        
        if (sTransactionReceipt && transaction.to && transaction.data != '0x') {
            const contractData = await getContractData(uid, workspace, transaction.to);
            contractAbi = contractData ? contractData.abi : null
        }

        return _sanitize({
           ...sTransaction,
            receipt: sTransactionReceipt,
            timestamp: timestamp,
            functionSignature: contractAbi ? _getFunctionSignatureForTransaction(transaction, contractAbi) : null
        });
    },
    isJson: _isJson
}

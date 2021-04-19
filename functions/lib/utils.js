const ethers = require('ethers');

module.exports = {
    sanitize: () => {
        return Object.fromEntries(
            Object.entries(obj)
                .filter(([_, v]) => v != null)
        );
    },
    stringifyBns: (obj) => {
        var res = {}
        for (const key in obj) {
            if (ethers.BigNumber.isBigNumber(obj[key])) {
                res[key] = obj[key].toString();
            }
            else {
                res[key] = obj[key];
            }
        }
        return res;
    },
    getFunctionSignature(input, value, abi) {
        if (!input || !value || !abi)
            return null;

        var jsonInterface = new ethers.utils.Interface(abi);

        var parsedTransactionData = jsonInterface.parseTransaction({ data: input, value: value });
        var fragment = parsedTransactionData.functionFragment;

        return `${fragment.name}(` + fragment.inputs.map((input) => `${input.type} ${input.name}`).join(', ') + ')'
    }
}
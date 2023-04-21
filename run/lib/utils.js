const ethers = require('ethers');

const DEFAULT_PROMISE_TIMEOUT = 10 * 1000;

const getEnv = () => process.env.NODE_ENV;

const withTimeout = (promise, delay = DEFAULT_PROMISE_TIMEOUT) => {
    const timeout = new Promise((resolve, reject) =>
        setTimeout(
            () => reject(`Timed out after ${delay} ms.`),
            delay
        )
    );
    return Promise.race([
        promise,
        timeout
    ]);
}

const isStringifiedBN = function(obj) {
    if (!obj)
        return false;
    return !!obj['type']
    && obj['type'] === 'BigNumber'
    && !!obj['hex'];
};

const _isJson = function(obj) {
    try {
        JSON.parse(obj);
        return true;
    } catch(e) {
        return false;
    }
};

const _sanitize = (obj) => {
    const numberize = ['baseFeePerGas', 'blockNumber', 'cumulativeGasUsed', 'effectiveGasPrice', 'gasUsed', 'logIndex', 'chainId', 'gasLimit', 'gasPrice', 'v', 'value', 'type', 'transactionIndex', 'status']
    return Object.fromEntries(
        Object.entries(obj)
            .filter(([_, v]) => v != null)
            .map(([_, v]) => {
                if (typeof v == 'string' && v.length == 42 && v.startsWith('0x'))
                    return [_, v.toLowerCase()];
                else if (typeof v == 'string' && numberize.indexOf(_) > -1 && v.startsWith('0x'))
                    return [_, parseInt(v, 16)];
                else if (typeof v == 'object' && numberize.indexOf(_) > -1 && ethers.BigNumber.isBigNumber(v))
                    return [_, ethers.BigNumber.from(v).toString()];
                else
                    return [_, v];
            })
    );
};

const _stringifyBns = (obj) => {
    var res = {}
    for (const key in obj) {
        if (ethers.BigNumber.isBigNumber(obj[key]) || isStringifiedBN(obj[key])) {
            res[key] = ethers.BigNumber.from(obj[key]).toString();
        }
        else if (typeof obj[key] !== 'function') {
            res[key] = obj[key];
        }
    }
    return res;
};

module.exports = {
    sanitize: _sanitize,
    stringifyBns: _stringifyBns,
    isJson: _isJson,
    getEnv: getEnv,
    withTimeout: withTimeout
};

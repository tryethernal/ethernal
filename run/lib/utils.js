const ethers = require('ethers');

const getEnv = () => process.env.NODE_ENV;

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
    return Object.fromEntries(
        Object.entries(obj)
            .filter(([_, v]) => v != null)
            .map(([_, v]) => {
                if (v.constructor.name == 'ArrayUnionTransform')
                    return [_, v.elements];
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
    getEnv: getEnv
}

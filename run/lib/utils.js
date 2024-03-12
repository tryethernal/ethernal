const ethers = require('ethers');

const DEFAULT_PROMISE_TIMEOUT = 10 * 1000;

const getEnv = () => process.env.NODE_ENV;

const processRawRpcObject = (obj, storedKeys) => {
    const rawKeys = Object.keys(obj).filter(k => storedKeys.indexOf(k) == -1);
    const processedObj = {};
    const raw = {};
    for (let i = 0; i < storedKeys.length; i++)
        processedObj[storedKeys[i]] = obj[storedKeys[i]];
    for (let i = 0; i < rawKeys.length; i++)
        raw[rawKeys[i]] = obj[rawKeys[i]];

    return { ..._sanitize(processedObj), raw: _sanitize(raw) };
};

// https://gist.github.com/hagemann/382adfc57adbd5af078dc93feef01fe1
const slugify = (string) => {
    const a = 'àáâäæãåāăąçćčđďèéêëēėęěğǵḧîïíīįìıİłḿñńǹňôöòóœøōõőṕŕřßśšşșťțûüùúūǘůűųẃẍÿýžźż·/_,:;'
    const b = 'aaaaaaaaaacccddeeeeeeeegghiiiiiiiilmnnnnoooooooooprrsssssttuuuuuuuuuwxyyzzz------'
    const p = new RegExp(a.split('').join('|'), 'g')
  
    return string.toString().toLowerCase()
      .replace(/\s+/g, '-') // Replace spaces with -
      .replace(p, c => b.charAt(a.indexOf(c))) // Replace special characters
      .replace(/&/g, '-and-') // Replace & with 'and'
      .replace(/[^\w\-]+/g, '') // Remove all non-word characters
      .replace(/\-\-+/g, '-') // Replace multiple - with single -
      .replace(/^-+/, '') // Trim - from start of text
      .replace(/-+$/, '') // Trim - from end of text
};

const withTimeout = (promise, delay = DEFAULT_PROMISE_TIMEOUT) => {
    const timeout = new Promise((resolve, reject) =>
        setTimeout(
            () => reject(new Error(`Timed out after ${delay} ms.`)),
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

const _sanitize = (obj, numberization = true) => {
    const numberize = ['number', 'difficulty', 'totalDifficulty', 'size', 'timestamp', 'nonce', 'baseFeePerGas', 'blockNumber', 'cumulativeGasUsed', 'effectiveGasPrice', 'gasUsed', 'logIndex', 'chainId', 'gasLimit', 'gasPrice', 'v', 'value', 'type', 'transactionIndex', 'status', 'l1BlockNumber'];
    return Object.fromEntries(
        Object.entries(obj)
            .filter(([_, v]) => v != null)
            .map(([_, v]) => {
                if (typeof v == 'string' && v.length == 42 && v.startsWith('0x'))
                    return [_, v.toLowerCase()];
                else if (typeof v == 'string' && numberization && numberize.indexOf(_) > -1 && v.startsWith('0x'))
                    return [_, parseInt(v, 16)];
                else if (typeof v == 'object' && numberization && numberize.indexOf(_) > -1 && ethers.BigNumber.isBigNumber(v))
                    return [_, ethers.BigNumber.from(v).toString()];
                else
                    return [_, v];
            })
    );
};

const stringify = (obj) => {
    if (!obj)
        return null;
    if (ethers.BigNumber.isBigNumber(obj) || isStringifiedBN(obj))
        return ethers.BigNumber.from(obj).toString();
    else if (typeof obj.toString == 'function')
        return obj.toString();
    else
        return String(obj);
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
    withTimeout: withTimeout,
    slugify,
    stringify,
    processRawRpcObject
};

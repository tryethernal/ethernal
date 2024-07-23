const Web3 = require('web3');
const ethers = require('ethers');
const BigNumber = ethers.BigNumber;

export const debounce = (func, wait) => {
    let debounceTimeout;
    return (...args) => {
        clearTimeout(debounceTimeout);
        debounceTimeout = setTimeout(() => func.apply(this, args), wait);
    };
};

export const isValidEthAddress = (val) => {
    return val.match(/(\b0x[A-Fa-f0-9]{40}\b)/g);
};

export const BNtoSignificantDigits = (num, digits = 4) => {
    if (!num) return num;

    return parseFloat((+ethers.utils.formatEther(num)).toPrecision(digits));
};

/******************************************************************
 * Converts e-Notation Numbers to Plain Numbers
 ******************************************************************
 * From: https://stackoverflow.com/a/66072001/1373409
 * @function eToNumber(number)
 * @version  1.00
 * @param   {e nottation Number} valid Number in exponent format.
 *          pass number as a string for very large 'e' numbers or with large fractions
 *          (none 'e' number returned as is).
 * @return  {string}  a decimal number string.
 * @author  Mohsen Alyafei
 * @date    17 Jan 2020
 * Note: No check is made for NaN or undefined input numbers.
 *
 *****************************************************************/
 export const eToNumber = (num) => {
    let sign = "";
    (num += "").charAt(0) == "-" && (num = num.substring(1), sign = "-");
    let arr = num.split(/[e]/ig);
    if (arr.length < 2) return sign + num;
    let dot = (.1).toLocaleString().substr(1, 1), n = arr[0], exp = +arr[1],
        w = (n = n.replace(/^0+/, '')).replace(dot, ''),
      pos = n.split(dot)[1] ? n.indexOf(dot) + exp : w.length + exp,
      L = pos - w.length, s = "" + BigNumber.from(w);
      w = exp >= 0 ? (L >= 0 ? s + "0".repeat(L) : r()) : (pos <= 0 ? "0" + dot + "0".repeat(Math.abs(pos)) + s : r());
    L= w.split(dot); if (L[0]==0 && L[1]==0 || (+w==0 && +s==0) ) w = 0; //** added 9/10/2021
    return sign + w;
    function r() {return w.replace(new RegExp(`^(.{${pos}})(.)`), `$1${dot}$2`)}
  }

export const isUrlValid = (url) => {
    try {
        new URL(url);
        return true;
    } catch(error) {
        return false;
    }
};

export const hex2rgba = (hex, alpha = 1) => {
    const [r, g, b] = hex.match(/\w\w/g).map(x => parseInt(x, 16));
    return `rgba(${r},${g},${b},${alpha})`;
};

export const getGasPriceFromTransaction= (transaction) => {
    if (!transaction || !transaction.receipt)
        return null;

    const receipt = transaction.receipt;
    const gasPrice = receipt.effectiveGasPrice || transaction.gasPrice;

    let amountInt;
    try {
        let parsedBigNumberAmount = ethers.BigNumber.from(JSON.parse(gasPrice))
        if (typeof parsedBigNumberAmount == 'bigint')
            amountInt = parsedBigNumberAmount.toString();
        else
            amountInt = parsedBigNumberAmount;
    } catch(_) {
        amountInt = gasPrice
    }

    return amountInt;
};

export const shortRpcUrl = (rpc) => {
    try {
        const url = new URL(rpc);
        return url.origin;
    } catch(error) {
        return rpc || '';
    }
}

export const sanitize = function(obj) {
    return Object.fromEntries(
        Object.entries(obj)
            .filter(([, v]) => v != null)
            .map(([_, v]) => {
                if (typeof v == 'string' && v.length == 42 && v.startsWith('0x'))
                    return [_, v.toLowerCase()];
                else
                    return [_, v];
            })
    );
};

export const getProvider = function(rpcServer) {
    if (rpcServer.startsWith('ws://') || rpcServer.startsWith('wss://')) {
        return new Web3.providers.WebsocketProvider(rpcServer);
    }
    if (rpcServer.startsWith('http://') || rpcServer.startsWith('https://')) {
        return new Web3.providers.HttpProvider(rpcServer, { keepAlive: true, withCredentials: true });
    }
};

export const processMethodCallParam = function(param, inputType) {
    if (inputType == 'bool')
        if (param === 'true')
            return true;
        else if (param == 'false')
            return false;
        else
            throw new Error("Input needs to be 'true' or 'false'");
    else if (inputType.endsWith(']') || inputType == 'tuple')
        try {
            return JSON.parse(param);
        } catch(_error) {
            return param.slice(1, param.length - 1).split(',').map(el => el.trim());
        }
    return param;
};

export const formatContractPattern = function(pattern) {
    switch (pattern) {
        case 'erc20':
            return 'ERC 20';
        case 'proxy':
            return 'Proxy'
        case 'erc721':
            return 'ERC 721';
        case 'erc1155':
            return 'ERC 1155';
        default:
            return pattern;
    }
};

export const formatNumber = (number, options = {}) => {
    if (number === undefined || number === null) return;
    const formatUnits = ethers.utils.formatUnits;
    const BigNumber = ethers.BigNumber;
    const formatter = Intl.NumberFormat('en-US', { style: 'decimal', notation: 'compact', maximumFractionDigits: options.maximumFractionDigits || 4 });
    const decimals = options.decimals === 0 ? 0 : (options.decimals || 18);

    if (options.short) {
        if (BigNumber.isBigNumber(number) || typeof number == 'string')
            return formatter.format(formatUnits(BigNumber.from(number), decimals));
        else
            return formatter.format(number);
    }
    else {
        return ethers.utils.commify(formatUnits(BigNumber.from(number), decimals).split('.')[0]);
    }
};

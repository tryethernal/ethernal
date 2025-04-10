const Web3 = require('web3');
const ethers = require('ethers');
// const BigNumber = ethers.BigNumber;

const fromWei = require('../filters/FromWei');

const MINIMUM_DISPLAY_GWEI = 10000000;

export const displayGasPrice = (gasPrice) => {
    if (gasPrice === null || gasPrice === undefined)
        return null;
    else if (gasPrice <= 0)
        return '0 gwei';
    else if (gasPrice < MINIMUM_DISPLAY_GWEI)
        return '<0.01 gwei';
    else
        return fromWei(gasPrice, 'gwei', 'gwei', false, 2);
};

export const displayPercentage = (value) => {
    if (value === null || value === undefined)
        return null;
    else if (value == 0)
        return '0%';
    else if (value < 0.0001)
        return '<0.01%';
    else
        return `${(value * 100).toFixed(2)}%`;
};

export const getBestContrastingColor = (background, themeColors) => {
    const colorValues = {
        [themeColors.primary]: 'primary',
        [themeColors.accent]: 'accent'
    }
    const colors = Object.keys(colorValues);

    // Convert hex to RGB
    const hexToRgb = (hex) => {
        // Handle hex with opacity (#RRGGBBAA)
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})?$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16),
            a: result[4] ? parseInt(result[4], 16) / 255 : 1
        } : null;
    };

    // Calculate relative luminance
    const getLuminance = (r, g, b) => {
        const a = [r, g, b].map(v => {
            v /= 255;
            return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
        });
        return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
    };

    // Calculate contrast ratio
    const getContrastRatio = (l1, l2) => {
        const lighter = Math.max(l1, l2);
        const darker = Math.min(l1, l2);
        return (lighter + 0.05) / (darker + 0.05);
    };

    // Validate inputs
    const bg = hexToRgb(background);
    if (!bg) {
        console.error(`Invalid background color: ${background}`);
        return null;
    }

    if (!Array.isArray(colors) || colors.length === 0) {
        console.error('Colors array is empty or invalid.');
        return null;
    }

    const bgLuminance = getLuminance(bg.r, bg.g, bg.b);
    let bestContrast = 0;
    let bestColor = colors[0]; // Default to first color

    colors.forEach(color => {
        const rgb = hexToRgb(color);
        if (!rgb) {
            console.error(`Invalid color: ${color}`);
            return;
        }
        const luminance = getLuminance(rgb.r, rgb.g, rgb.b);
        const contrast = getContrastRatio(bgLuminance, luminance);

        if (contrast > bestContrast) {
            bestContrast = contrast;
            bestColor = color;
        }
    });

    return colorValues[bestColor];
};

// https://stackoverflow.com/a/22885197/1373409
export const getSignificantDigitCount = (n) => {
    const log10 = Math.log(10);
    n = Math.abs(String(n).replace(".", "")); //remove decimal and make positive
    if (n == 0) return 0;
    while (n != 0 && n % 10 == 0) n /= 10; //kill the 0s at the end of n

    return Math.floor(Math.log(n) / log10) + 1; //get number of digits
}

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

export const eToNumber = (num) => {
    let sign = "";
    (num += "").charAt(0) === "-" && (num = num.substring(1), sign = "-");
    let arr = num.split(/[eE]/);
    if (arr.length < 2) return sign + num;
    let n = arr[0];
    let exp = +arr[1];
    let dot = '.';
    let parts = n.split(dot);
    let integerPart = parts[0];
    let fractionalPart = parts[1] || "";
    if (exp > 0) {
        if (fractionalPart.length <= exp) {
            fractionalPart = fractionalPart.padEnd(exp, '0');
            n = integerPart + fractionalPart;
        } else {
            n = integerPart + fractionalPart.substring(0, exp) + dot + fractionalPart.substring(exp);
        }
    } else {
        if (integerPart.length + exp > 0) {
            n = integerPart.slice(0, exp) + dot + integerPart.slice(exp) + fractionalPart;
        } else {
            n = "0" + dot + "0".repeat(Math.abs(exp) - integerPart.length) + integerPart + fractionalPart;
        }
    }
    n = n.replace(/^0+(?=\d)|(\.0+|(?<=\.\d*)0+)$/g, '');
    return sign + n;
};


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
            return 'ERC-20';
        case 'proxy':
            return 'Proxy'
        case 'erc721':
            return 'ERC-721';
        case 'erc1155':
            return 'ERC-1155';
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

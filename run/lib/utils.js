/**
 * @fileoverview Common utility functions used throughout the backend.
 * Provides helpers for data sanitization, string manipulation, BigNumber handling,
 * and ERC721 metadata formatting.
 * @module lib/utils
 */

const ethers = require('ethers');

/** @constant {number} Default timeout for promises in milliseconds */
const DEFAULT_PROMISE_TIMEOUT = 10 * 1000;

/**
 * Calculates the average of an array of numbers.
 *
 * @param {number[]} arr - Array of numbers to average
 * @returns {number} Rounded average value
 * @example
 * avg([1, 2, 3, 4, 5]); // returns 3
 */
const avg = (arr) => {
    const sum = arr.reduce((a, v) => a + v);
    return Math.round(sum/arr.length);
};

/**
 * Pauses execution for a specified duration.
 *
 * @param {number} ms - Duration to sleep in milliseconds
 * @returns {Promise<void>} Resolves after the specified delay
 * @example
 * await sleep(1000); // waits 1 second
 */
const sleep = (ms) => {
    return new Promise((r) => setTimeout(r, ms))
};

/**
 * Validates that a string represents a valid positive BigNumber in wei.
 *
 * @param {string} str - String to validate as a BigNumber
 * @returns {boolean} True if valid positive wei amount, false otherwise
 * @example
 * validateBNString('1000000000000000000'); // returns true (1 ETH in wei)
 * validateBNString('-100'); // returns false
 */
const validateBNString = (str) => {
    try {
        const bn = ethers.BigNumber.from(str);
        return bn.gt(0) && !!ethers.utils.formatUnits(str, 'ether');
    } catch(error) {
        return false;
    }
}

/**
 * Converts scientific notation (e-notation) to a regular number string.
 * Handles both positive and negative exponents.
 *
 * @param {string|number} num - Number in scientific notation
 * @returns {string} Number as a regular decimal string
 * @example
 * eToNumber('1.5e18'); // returns '1500000000000000000'
 * eToNumber('1e-5'); // returns '0.00001'
 */
const eToNumber = (num) => {
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

/**
 * Gets the current Node.js environment.
 *
 * @returns {string|undefined} Value of NODE_ENV environment variable
 */
const getEnv = () => process.env.NODE_ENV;

/**
 * Formats ERC721 NFT metadata into a structured object with categorized attributes.
 * Converts IPFS URLs to HTTP gateway URLs and organizes attributes by type.
 *
 * @param {string|number} tokenId - The token ID
 * @param {Object} metadata - Raw NFT metadata object
 * @param {string} [metadata.name] - Token name
 * @param {string} [metadata.image] - Image URL (supports ipfs:// protocol)
 * @param {string} [metadata.image_data] - Raw SVG or HTML image data
 * @param {string} [metadata.background_color] - Background color hex
 * @param {string} [metadata.external_url] - External link
 * @param {string} [metadata.description] - Token description
 * @param {Array<Object>} [metadata.attributes] - Array of attribute objects
 * @returns {Object} Formatted metadata with categorized attributes
 * @returns {string} returns.name - Token name or fallback "#tokenId"
 * @returns {string} returns.image_data - HTML img tag or raw image data
 * @returns {Array} returns.properties - String-value attributes
 * @returns {Array} returns.levels - Numeric attributes without display_type
 * @returns {Array} returns.boosts - Boost percentage/number attributes
 * @returns {Array} returns.stats - Numeric attributes with display_type 'number'
 * @returns {Array} returns.dates - Date-type attributes
 */
const formatErc721Metadata = (tokenId, metadata) => {
    if (!metadata || tokenId === null || tokenId === undefined)
        return {};

    const name = metadata.name || `#${tokenId}`;

    let image_data;
    if (metadata.image_data)
        image_data = metadata.image_data;
    else if (metadata.image) {
        const insertableImage = metadata.image.startsWith('ipfs://') ?
            `https://ipfs.io/ipfs/${metadata.image.slice(7, metadata.image.length)}` :
            metadata.image;

        image_data = `<img style="height: 100%; width: 100%; object-fit: cover" src="${insertableImage}" />`;
    }

    const attributes = metadata.attributes && typeof metadata.attributes.filter == 'function' ? metadata.attributes : [];

    const properties = attributes.filter(metadata => {
        return metadata.value &&
            !metadata.display_type &&
            typeof metadata.value == 'string';
    });

    const levels = attributes.filter(metadata => {
        return metadata.value &&
            !metadata.display_type &&
            typeof metadata.value == 'number';
    });

    const boosts = attributes.filter(metadata => {
        return metadata.display_type &&
            metadata.value &&
            typeof metadata.value == 'number' &&
            ['boost_number', 'boost_percentage'].indexOf(metadata.display_type) > -1;
    });

    const stats = attributes.filter(metadata => {
        return metadata.display_type &&
            metadata.value &&
            typeof metadata.value == 'number' &&
            metadata.display_type == 'number';
    });

    const dates = attributes.filter(metadata => {
        return metadata.display_type &&
            metadata.display_type == 'date';
    });

    return { background_color: metadata.background_color, name, image_data, external_url: metadata.external_url, description: metadata.description, properties, levels, boosts, stats, dates };
};

/**
 * Processes an RPC response object by separating known fields from raw data.
 * Known fields are stored directly, unknown fields go into a 'raw' object.
 *
 * @param {Object} obj - RPC response object to process
 * @param {string[]} storedKeys - Keys to store as direct properties
 * @param {string[]} [excludeFromRaw=[]] - Keys to exclude from both stored and raw
 * @returns {Object} Processed object with stored keys and raw object
 * @example
 * processRawRpcObject(
 *   { hash: '0x...', number: 1, custom: 'value' },
 *   ['hash', 'number']
 * );
 * // returns { hash: '0x...', number: 1, raw: { custom: 'value' } }
 */
const processRawRpcObject = (obj, storedKeys, excludeFromRaw = []) => {
    const rawKeys = Object.keys(obj).filter(k => storedKeys.indexOf(k) == -1 && excludeFromRaw.indexOf(k) == -1);
    const processedObj = {};
    const raw = {};
    for (let i = 0; i < storedKeys.length; i++)
        processedObj[storedKeys[i]] = obj[storedKeys[i]];
    for (let i = 0; i < rawKeys.length; i++)
        raw[rawKeys[i]] = obj[rawKeys[i]];

    return { ..._sanitize(processedObj), raw: _sanitize(raw) };
};

/**
 * Converts a string to a URL-friendly slug.
 * Handles special characters, accents, and spaces.
 *
 * @param {string} string - String to slugify
 * @returns {string} URL-safe slug
 * @see https://gist.github.com/hagemann/382adfc57adbd5af078dc93feef01fe1
 * @example
 * slugify('Hello World!'); // returns 'hello-world'
 * slugify('Café & Restaurant'); // returns 'cafe-and-restaurant'
 */
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

/**
 * Wraps a promise with a timeout. Rejects if the promise doesn't resolve within the delay.
 *
 * @param {Promise} promise - Promise to wrap with timeout
 * @param {number} [delay=10000] - Timeout in milliseconds
 * @returns {Promise} Resolves with promise result or rejects on timeout
 * @throws {Error} "Timed out after {delay} ms." if timeout exceeded
 * @example
 * await withTimeout(fetchData(), 5000); // times out after 5 seconds
 */
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

/**
 * Checks if an object is a stringified ethers BigNumber.
 *
 * @param {Object} obj - Object to check
 * @returns {boolean} True if object has BigNumber structure { type: 'BigNumber', hex: '...' }
 */
const isStringifiedBN = function(obj) {
    if (!obj)
        return false;
    return !!obj['type']
    && obj['type'] === 'BigNumber'
    && !!obj['hex'];
};

/**
 * Checks if a string is valid JSON.
 *
 * @param {string} obj - String to check
 * @returns {boolean} True if string can be parsed as JSON
 */
const _isJson = function(obj) {
    try {
        JSON.parse(obj);
        return true;
    } catch(e) {
        return false;
    }
};

/**
 * Sanitizes an object from RPC responses.
 * - Removes null/undefined values
 * - Lowercases Ethereum addresses
 * - Converts hex strings to integers for known numeric fields
 * - Converts BigNumber objects to strings
 *
 * @param {Object} obj - Object to sanitize
 * @param {boolean} [numberization=true] - Whether to convert hex to numbers
 * @returns {Object} Sanitized object
 * @example
 * _sanitize({ blockNumber: '0x10', hash: '0xABC...', extra: null });
 * // returns { blockNumber: 16, hash: '0xabc...' }
 */
const _sanitize = (obj, numberization = true) => {
    const numberize = [
        'number',
        'difficulty',
        'totalDifficulty',
        'size',
        'timestamp',
        'nonce',
        'baseFeePerGas',
        'blockNumber',
        'cumulativeGasUsed',
        'effectiveGasPrice',
        'gasUsed',
        'logIndex',
        'chainId',
        'gasLimit',
        'gasPrice',
        'v',
        'value',
        'type',
        'transactionIndex',
        'status',
        'l1BlockNumber',
        'gas',
        'maxFeePerGas',
        'maxPriorityFeePerGas',
        'blobGasUsed',
        'blobGasPrice',
        'timeboosted',
        'gasUsedForL1',
        'sendCount',
        'requestId'
    ];

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

/**
 * Converts a value to its string representation.
 * Handles BigNumbers, objects with toString(), and primitives.
 *
 * @param {*} obj - Value to stringify
 * @returns {string|null} String representation or null if input is falsy
 */
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

/**
 * Converts all BigNumber values in an object to strings.
 * Non-function properties are preserved as-is if not BigNumbers.
 *
 * @param {Object} obj - Object containing potential BigNumber values
 * @returns {Object} New object with BigNumbers converted to strings
 */
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

/**
 * Sanitize pagination parameters for API requests
 * @param {string|number} page - Page number (1-indexed)
 * @param {string|number} itemsPerPage - Items per page
 * @param {string} order - Sort order (ASC or DESC)
 * @param {Object} options - Additional options
 * @param {number} options.maxItems - Maximum items per page (default: 100)
 * @returns {Object} Sanitized { page, itemsPerPage, order }
 */
const sanitizePagination = (page, itemsPerPage, order, options = {}) => {
    const { maxItems = 100 } = options;
    return {
        page: Math.max(1, parseInt(page) || 1),
        itemsPerPage: Math.min(maxItems, Math.max(1, parseInt(itemsPerPage) || 10)),
        order: ['ASC', 'DESC'].includes(order?.toUpperCase()) ? order.toUpperCase() : 'DESC'
    };
};

module.exports = {
    sanitize: _sanitize,
    stringifyBns: _stringifyBns,
    isJson: _isJson,
    getEnv: getEnv,
    withTimeout: withTimeout,
    slugify,
    stringify,
    processRawRpcObject,
    formatErc721Metadata,
    validateBNString,
    sleep,
    avg,
    eToNumber,
    sanitizePagination
};

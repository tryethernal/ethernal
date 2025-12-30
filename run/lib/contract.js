/**
 * @fileoverview Contract ABI analysis utilities.
 * Detects token standards (ERC20/721/1155) from ABI definitions.
 * @module lib/contract
 */

const ethers = require('ethers');

const SELECTORS = require('./abis/selectors.json');

/**
 * Checks if an ABI contains all required selectors for a pattern.
 * @param {Array<Object>} abi - Contract ABI array
 * @param {Object} pattern - Pattern with functions, events, errors arrays
 * @returns {boolean} True if all selectors found
 * @private
 */
const findSelectors = (abi, pattern) => {
    try {
        const iface = new ethers.utils.Interface(abi);

        for (let i = 0; i < pattern.functions.length; i++) {
            try {
                iface.getFunction(pattern.functions[i]);
            } catch (_) {
                return false;
            }
        }

        for (let i = 0; i < pattern.events.length; i++) {
            try {
                iface.getEvent(pattern.events[i]);
            } catch (_) {
                return false;
            }
        }

        for (let i = 0; i < pattern.errors.length; i++) {
            try {
                iface.getError(pattern.errors[i]);
            } catch (_) {
                return false;
            }
        }

        return true;
    } catch(error) {
        return false;
    }
};

/**
 * Checks if ABI represents an ERC20 token contract.
 * @param {Array<Object>} abi - Contract ABI
 * @returns {boolean} True if ERC20 compliant
 */
const isErc20 = (abi) => {
    return findSelectors(abi, SELECTORS.erc20);
};

/**
 * Checks if ABI represents an ERC721 NFT contract.
 * @param {Array<Object>} abi - Contract ABI
 * @returns {boolean} True if ERC721 compliant
 */
const isErc721 = (abi) => {
    return findSelectors(abi, SELECTORS.erc721);
};

/**
 * Checks if ABI represents an ERC1155 multi-token contract.
 * @param {Array<Object>} abi - Contract ABI
 * @returns {boolean} True if ERC1155 compliant
 */
const isErc1155 = (abi) => {
    return findSelectors(abi, SELECTORS.erc1155);
};

module.exports = {
    isErc20,
    isErc721,
    isErc1155
};

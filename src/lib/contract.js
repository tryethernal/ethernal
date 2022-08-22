 const ethers = require('ethers');

const SELECTORS = require('../abis/selectors.json');

const findSelectors = (abi, pattern) => {
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
};

const isErc20 = (abi) => {
    return findSelectors(abi, SELECTORS.erc20);
};

module.exports = {
    isErc20: isErc20
};

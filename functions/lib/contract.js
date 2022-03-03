 const ethers = require('ethers');

const SELECTORS = {
    erc20: {
        functions: [
            '0x18160ddd', // totalSupply()
            '0x70a08231', // balanceOf(address)
            '0xa9059cbb', // transfer(address,uint256)
            '0xdd62ed3e', // allowance(address,address)
            '0x095ea7b3', // approve(address,uint256)
            '0x23b872dd' // transferFrom(address,address,uint256)]
        ],
        events: [
            '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef', // Transfer(address,address,uint256)
            '0x8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b925' // Approval(address,address,uint256)
        ],
        errors: []
    }
};

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

const isErc20 = (abi) => {
    return findSelectors(abi, SELECTORS.erc20);
};

module.exports = {
    isErc20: isErc20
};

const SELECTORS = require('../abis/selectors.json');
const abis = {
    erc20: require('../abis/erc20.json')
};

export const findAbiForEvent = (topic) => {
    const patterns = Object.keys(SELECTORS);

    for (let i = 0; i < patterns.length; i++) {
        const pattern = patterns[i];
        const idx = SELECTORS[pattern].events.indexOf(topic);
        if (idx > -1) {
            return abis[pattern];
        }
    }
};

export const findAbiForFunction = (signature) => {
    const patterns = Object.keys(SELECTORS);

    for (let i = 0; i < patterns.length; i++) {
        const pattern = patterns[i];
        const idx = SELECTORS[pattern].functions.indexOf(signature);
        if (idx > -1) {
            return abis[pattern];
        }
    }
};

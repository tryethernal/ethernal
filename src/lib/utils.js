const Web3 = require('web3');
const ethers = require('ethers');

export const getPaginatedQuery = function(collection, items, currentOptions, newOptions) {
    let query;
    const sortDirection = newOptions.sortDesc[0] === false ? 'asc' : 'desc';
    const sortByField = newOptions.sortBy[0] || currentOptions.sortBy[0];

    if (currentOptions.sortDesc[0] != newOptions.sortDesc[0])
        query = collection
            .orderBy(sortByField, sortDirection)
            .limit(newOptions.itemsPerPage);
    else if (newOptions.page > currentOptions.page)
        query = collection
            .orderBy(sortByField, sortDirection)
            .startAfter(items[items.length - 1][sortByField])
            .limit(newOptions.itemsPerPage);
    else if (newOptions.page < currentOptions.page)
        query = collection
            .orderBy(sortByField, sortDirection)
            .endBefore(items[items.length - 1][sortByField])
            .limit(newOptions.itemsPerPage);
    else
        query = collection
            .orderBy(sortByField, sortDirection)
            .startAt(items[0][newOptions])
            .limit(newOptions.itemsPerPage);

    return query;
};

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
    if (inputType.indexOf('[]') > -1 || inputType == 'tuple')
        return param.slice(1, param.length - 1).split(',').map(el => el.trim());

    return param;
};

export const formatSolidityObject = function(obj, commified) {
    if (!obj)
        return obj;

    if (ethers.BigNumber.isBigNumber(obj) && commified)
        return ethers.utils.commify(ethers.utils.formatUnits(ethers.BigNumber.from(obj)));
    else if (ethers.BigNumber.isBigNumber(obj))
        return ethers.BigNumber.from(obj).toString();
    else
        return obj;
};

export const formatContractPattern = function(pattern) {
    switch (pattern) {
        case 'erc20':
            return 'ERC 20';
        case 'proxy':
            return 'Proxy'
        default:
            return pattern;
    }
};

export const formatResponse = function(response, commified) {
    if (Array.isArray(response)) {
        let formattedResponse = [];
        response.forEach((el) => {
            formattedResponse.push(formatSolidityObject(el, commified));
        })
        return `[${formattedResponse.join(', ')}]`;
    }
    else if (response !== null && typeof response === 'object') {
        return formatSolidityObject(response, commified);
    }
    else
        return response;
};

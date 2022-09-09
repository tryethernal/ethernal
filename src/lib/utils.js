const Web3 = require('web3');

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
        default:
            return pattern;
    }
};

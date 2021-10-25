const Web3 = require('web3');
const ethers = require('ethers');

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
    const regexArray = new RegExp("^(.*)\\[([0-9]*)\\]$");

    if (inputType.match(regexArray))
        return JSON.parse(param);

    return param;
};

export const formatSolidityObject = function(obj) {
    if (!obj.type)
        return obj;

    switch(obj.type) {
        case 'BigNumber':
            return ethers.BigNumber.from(obj.hex).toString();
        default:
            return obj;
    }
};

const Web3 = require('web3');

export const sanitize = function(obj) {
    return Object.fromEntries(Object.entries(obj).filter(([, v]) => v != null));
};

export const getProvider = function(rpcServer) {
    if (rpcServer.startsWith('ws://') || rpcServer.startsWith('wss://')) {
        return new Web3.providers.WebsocketProvider(rpcServer);
    }
    if (rpcServer.startsWith('http://') || rpcServer.startsWith('https://')) {
        return new Web3.providers.HttpProvider(rpcServer);
    }
}
const ethers = require('ethers');

const getProvider = function(url) {
    const rpcServer = new URL(url);
    var urlInfo;
    var provider = ethers.providers.WebSocketProvider;

    if (rpcServer.username != '' && rpcServer.password != '') {
        urlInfo = {
            url: `${rpcServer.origin}${rpcServer.pathName ? rpcServer.pathName : ''}`,
            user: rpcServer.username,
            password: rpcServer.password
        };
    }
    else {
        urlInfo = rpcServer.href;
    }

    if (rpcServer.protocol == 'http:' || rpcServer.protocol == 'https:') {
        provider = ethers.providers.JsonRpcProvider;
    }
    else if (rpcServer.protocol == 'ws:' || rpcServer.protocol == 'wss:') {
        provider = ethers.providers.WebSocketProvider;
    }

    return new provider(urlInfo);
};

class ContractConnector {
    constructor(server, address, abi) {
        if (!server || !address || !abi) throw '[ContractConnector] Missing parameter';
        this.provider = getProvider(server);
        this.contract = new ethers.Contract(address, abi, this.provider);
    }

    callContractReadMethod(method, params, options) {
        try {
            return await this.contract.functions[method](...params, options);
        } catch(error) {
            console.log(error);
            return error.body ? JSON.parse(error.body).error.message : error.reason || error.message || "Can't connect to the server";
        }
    }
}

module.exports = {
    ContractConnector: ContractConnector
};

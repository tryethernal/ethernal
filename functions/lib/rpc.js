const ethers = require('ethers');
const { parseTrace, storeTrace } = require('./trace');

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

class Tracer {
    constructor(server) {
        if (!server) throw '[Tracer] Missing parameter';
        this.provider = getProvider(server);
    }

    async process(transaction) {
        try {
            this.transaction = transaction;
            const rawTrace = await this.provider.send('debug_traceTransaction', [transaction.hash, {}]);
            this.parsedTrace = await parseTrace(transaction.from, rawTrace, this.provider);
        } catch(error) {
            if (error.error && error.error.code == '-32601')
                throw 'debug_traceTransaction is not available';
            else
                throw error;
        }
    }

    async saveTrace(userId, workspace) {
        try {
            await storeTrace(userId, workspace, this.transaction.hash, this.parsedTrace);
        } catch(error) {
            console.log(error);
        }
    }
}

class ContractConnector {
    constructor(server, address, abi) {
        if (!server || !address || !abi) throw '[ContractConnector] Missing parameter';
        this.provider = getProvider(server);
        this.contract = new ethers.Contract(address, abi, this.provider);
    }

    async callReadMethod(method, params, options) {
        try {
            return await this.contract.functions[method](...Object.values(params), options);
        } catch(error) {
            console.log(error);
            return error.body ? JSON.parse(error.body).error.message : error.reason || error.message || "Can't connect to the server";
        }
    }
}

module.exports = {
    ContractConnector: ContractConnector,
    Tracer: Tracer
};

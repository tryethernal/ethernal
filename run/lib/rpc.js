const ethers = require('ethers');
const { parseTrace, processTrace } = require('./trace');
const writeLog = require('./writeLog');

let getProvider = function(url) {
    const rpcServer = new URL(url);

    let provider = ethers.providers.WebSocketProvider;

    if (rpcServer.protocol == 'http:' || rpcServer.protocol == 'https:') {
        provider = ethers.providers.JsonRpcProvider;
    }
    else if (rpcServer.protocol == 'ws:' || rpcServer.protocol == 'wss:') {
        provider = ethers.providers.WebSocketProvider;
    }

    return new provider(url);
};

class ProviderConnector {
    constructor(server) {
        if (!server) throw '[ProviderConnector] Missing server parameter';
        this.provider = getProvider(server);
    }

    async fetchBlockWithTransactions(blockNumber) {
        return await this.provider.getBlockWithTransactions(blockNumber);
    }

    async fetchTransactionReceipt(transactionHash) {
        return await this.provider.getTransactionReceipt(transactionHash)
    }
}

class Tracer {
    constructor(server, db) {
        if (!server) throw '[Tracer] Missing parameter';
        this.provider = getProvider(server);
        this.db = db;
    }

    async process(transaction) {
        try {
            this.transaction = transaction;
            const rawTrace = await this.provider.send('debug_traceTransaction', [transaction.hash, {}]);
            this.parsedTrace = await parseTrace(transaction.from, rawTrace, this.provider);
        } catch(error) {
            if (!error.error || error.error.code != '-32601') {
                writeLog({
                    severity: 'ERROR',
                    functionName: 'rpc.Tracer.process',
                    error: error,
                    extra: {
                        transaction: this.transaction.hash,
                    }
                });
                throw error;
            }
        }
    }

    async saveTrace(userId, workspace, db) {
        try {
            if (Array.isArray(this.parsedTrace))
                await processTrace(userId, workspace, this.transaction.hash, this.parsedTrace, this.db);
        } catch(error) {
            writeLog({
                severity: 'ERROR',
                functionName: 'rpc.Tracer.saveTrace',
                error: error,
                extra: {
                    userId: String(userId),
                    workspace: workspace,
                    transaction: this.transaction.hash,
                    trace: this.parsedTrace
                }
            });
            throw error;
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
            return (error.body ? JSON.parse(error.body).error.message : error.reason) || error.message || "Can't connect to the server";
        }
    }
}

module.exports = {
    ContractConnector: ContractConnector,
    Tracer: Tracer,
    ProviderConnector: ProviderConnector,
    getProvider: getProvider
};

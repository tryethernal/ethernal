const ethers = require('ethers');
const { parseTrace, processTrace } = require('./trace');
const { enqueueTask } = require('./tasks');
const writeLog = require('./writeLog');
const ERC721_ABI = require('./abis/erc721.json');
const ERC721_ENUMERABLE_ABI = require('./abis/erc721Enumerable.json');
const ERC721_METADATA_ABI = require('./abis/erc721Metadata.json');

const getProvider = function(url) {
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

    async fetchNetworkId() {
        const { chainId } = await this.provider.getNetwork();
        return chainId;
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

     INTERFACE_IDS = {
         '721': '0x80ac58cd',
         '721Metadata': '0x5b5e139f',
         '721Enumerable': '0x780e9d63'
     };

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

    async getBytecode() {
        try {
            return await this.provider.getCode(this.contract.address);
        } catch(error) {
            return (error.body ? JSON.parse(error.body).error.message : error.reason) || error.message || "Can't connect to the server";
        }
    }

    has721Interface() {
        try {
            return this.contract.supportsInterface(this.INTERFACE_IDS['721']);
        } catch(_error) {
            return new Promise(resolve => resolve(false));
        }
    }

    has721Metadata() {
        try {
            return this.contract.supportsInterface(this.INTERFACE_IDS['721Metadata']);
         } catch(_error) {
             return new Promise(resolve => resolve(false));
         }
    }

    has721Enumerable() {
        try {
            return this.contract.supportsInterface(this.INTERFACE_IDS['721Enumerable']);
        } catch(_error) {
            return new Promise(resolve => resolve(false));
        }
    }

    symbol() {
        try {
            return this.contract.symbol();
        } catch(_error) {
            console.log(_error);
            return new Promise(resolve => resolve(null));
        }
    }

    name() {
        try {
            return this.contract.name();
        } catch(_error) {
            return new Promise(resolve => resolve(null));
        }
    }

    async totalSupply() {
        try {
            const res = await this.contract.totalSupply();
            return res.toString();
        } catch(_error) {
            return null;
        }
    }
}

class ERC721Connector {

    constructor(server, address, interfaces = {}) {
        if (!server || !address) throw '[ERC721Connector] Missing parameter';

        this.interfaces = {
            metadata: !!interfaces.metadata,
            enumerable: !!interfaces.enumerable
        };

        this.abi = ERC721_ABI;
        this.address = address;

        if (this.interfaces.metadata)
            this.abi = this.abi.concat(ERC721_METADATA_ABI);

        if (this.interfaces.enumerable)
            this.abi = this.abi.concat(ERC721_ENUMERABLE_ABI);

        this.provider = getProvider(server);
        this.contract = new ethers.Contract(address, this.abi, this.provider);
    }

    async totalSupply() {
        try { 
            const res = await this.contract.totalSupply();
            return res.toString();
        } catch(_error) {
            return new Promise(resolve => resolve(null));
        }
    }

    async tokenByIndex(index) {
        try {
            const res = await this.contract.tokenByIndex(index);
            return res.toString();
        } catch(_error) {
            return new Promise(resolve => resolve(null));
        }
    }

    ownerOf(tokenId) {
        try {
            return this.contract.ownerOf(tokenId);
        } catch (_error) {
            return new Promise(resolve => resolve(null));
        }
    }

    symbol() {
        try {
            return this.contract.symbol();
        } catch(_error) {
            console.log(_error);
            return new Promise(resolve => resolve(null));
        }
    }

    name() {
        try {
            return this.contract.name();
        } catch(_error) {
            return new Promise(resolve => resolve(null));
        }
    }

    tokenURI(tokenId) {
        try {
            return this.contract.tokenURI(tokenId);
        } catch(_error) {
            return new Promise(resolve => resolve(null));
        }
    }

    async fetchAndStoreAllTokens(workspaceId) {
        if (!this.interfaces.enumerable)
            throw new Error('This method is only available on ERC721 implemeting the Enumerable interface');;

        const totalSupply = await this.totalSupply();
        if (!totalSupply)
            throw new Error(`totalSupply() doesn't seem to be implemented. Can't enumerate tokens`);

        for (let i = 0; i < totalSupply; i++) {
            const tokenId = await this.tokenByIndex(i);
            await enqueueTask('reloadErc721Token', {
                workspaceId: workspaceId,
                address: this.address,
                tokenId: tokenId,
                secret: process.env.AUTH_SECRET
            }, `${process.env.CLOUD_RUN_ROOT}/tasks/reloadErc721Token`);
        }
    }
}

module.exports = {
    ContractConnector: ContractConnector,
    Tracer: Tracer,
    ProviderConnector: ProviderConnector,
    getProvider: getProvider,
    ERC721Connector: ERC721Connector
};

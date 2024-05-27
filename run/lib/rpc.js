const ethers = require('ethers');
const { parseTrace, processTrace } = require('./trace');
const { bulkEnqueue } = require('./queue');
const logger = require('./logger');
const { withTimeout, sanitize } = require('../lib/utils');
const abiChecker = require('../lib/contract');

const ERC721_ABI = require('./abis/erc721.json');
const ERC20_ABI = require('./abis/erc20.json');
const ERC1155_ABI = require('./abis/erc1155.json');
const ERC721_ENUMERABLE_ABI = require('./abis/erc721Enumerable.json');
const ERC721_METADATA_ABI = require('./abis/erc721Metadata.json');
const ALL_ABIS = ERC721_ABI.concat(ERC20_ABI, ERC721_ENUMERABLE_ABI, ERC721_METADATA_ABI, ERC1155_ABI);

const getBalanceChange = async (address, token, blockNumber, rpcServer) => {
    let currentBalance = ethers.BigNumber.from('0');
    let previousBalance = ethers.BigNumber.from('0');
    const abi = ['function balanceOf(address owner) view returns (uint256)'];
    const contract = new ContractConnector(rpcServer, token, abi);

    try {
        const options = {
            from: null,
            blockTag: blockNumber
        };

        const res = await contract.callReadMethod('balanceOf(address)', { 0: address }, options);

        if (ethers.BigNumber.isBigNumber(res[0]))
            currentBalance = res[0];
        else
            if (res.startsWith && res.startsWith('call revert exception'))
                currentBalance = ethers.BigNumber.from('0');
            else
                throw new Error(res);
    } catch(error) {
        logger.error(error.message, { location: 'lib.rpc', error: error, data: { address, token, blockNumber }});
        throw error;
    }

    if (blockNumber > 1) {
        try {
            const options = {
                from: null,
                blockTag: Math.max(1, parseInt(blockNumber) - 1)
            };

            const res = await contract.callReadMethod('balanceOf(address)', { 0: address }, options);

            if (ethers.BigNumber.isBigNumber(res[0]))
                previousBalance = res[0];
            else
            if (res.startsWith && res.startsWith('call revert exception'))
                previousBalance = ethers.BigNumber.from('0');
            else
                throw new Error(res);
        }  catch(error) {
            logger.error(error.message, { location: 'lib.rpc', error: error, data: arguments });
            throw error;
        }
    }

    return {
        address: address,
        currentBalance: currentBalance.toString(),
        previousBalance: previousBalance.toString(),
        diff: currentBalance.sub(previousBalance).toString()
    };
}

const getProvider = function(url) {
    const rpcServer = new URL(url);

    let provider;
    if (rpcServer.protocol == 'http:' || rpcServer.protocol == 'https:') {
        provider = ethers.providers.JsonRpcProvider;
    }
    else if (rpcServer.protocol == 'ws:' || rpcServer.protocol == 'wss:') {
        provider = ethers.providers.WebSocketProvider;
    }

    let authenticatedUrl = url;
    if (rpcServer.username.length || rpcServer.password.length)
        authenticatedUrl = {
            url: rpcServer.origin,
            user: rpcServer.username,
            password: rpcServer.password
        };

    return new provider(authenticatedUrl);
};

class ProviderConnector {
    constructor(server, limiter) {
        if (!server) throw '[ProviderConnector] Missing server parameter';
        this.provider = getProvider(server);
        this.limiter = limiter;
    }

    async checkRateLimit() {
        if (this.limiter) {
            const { blocked: shouldLimit } = await this.limiter.wouldLimit();
            if (shouldLimit)
                throw new Error('Rate limited');
            await this.limiter.limit();
        }
    }

    fetchLatestBlock() {
        return withTimeout(this.provider.getBlock());
    }

    async fetchRawBlockWithTransactions(blockNumber) {
        await this.checkRateLimit();

        const res = await withTimeout(this.provider.send('eth_getBlockByNumber', [`0x${blockNumber.toString(16)}`, true]))
        return sanitize(res);
    }

    async fetchBlockWithTransactions(blockNumber) {
        try {
            return await withTimeout(this.provider.getBlockWithTransactions(blockNumber));
        } catch(error) {
            return await this.fetchRawBlockWithTransaction(blockNumber);
        }
    }

    async fetchTransactionReceipt(transactionHash) {
        try {
            return await withTimeout(this.provider.getTransactionReceipt(transactionHash));
        } catch(error) {
            const rawTransaction = await withTimeout(this.provider.send('eth_getTransactionReceipt', [transactionHash]));
            return sanitize(rawTransaction);
        }
    }

    async fetchNetworkId() {
        const { chainId } = await withTimeout(this.provider.getNetwork());
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
            const rawTrace = await withTimeout(this.provider.send('debug_traceTransaction', [transaction.hash, {}]));
            this.parsedTrace = await parseTrace(transaction.from, rawTrace, this.provider);
        } catch(error) {
            if (!error.error || error.error.code != '-32601') {
                throw error;
            }
        }
    }

    async saveTrace(userId, workspace) {
        try {
            if (Array.isArray(this.parsedTrace))
                await processTrace(userId, workspace, this.transaction.hash, this.parsedTrace, this.db);
        } catch(error) {
            throw error;
        }
    }
}

class ContractConnector {

     INTERFACE_IDS = {
         '721': '0x80ac58cd',
         '721Metadata': '0x5b5e139f',
         '721Enumerable': '0x780e9d63',
         '1155': '0xd9b67a26'
    };

    _decimals = undefined;
    _name = undefined;
    _symbol = undefined;
    _totalSupply = undefined;
    _isErc20 = undefined;
    _isErc721 = undefined;
    _isErc1155 = undefined;

    constructor(server, address, abi) {
        if (!server || !address) throw '[ContractConnector] Missing parameter';

        this.abi = abi || ALL_ABIS;
        this.address = address;
        this.provider = getProvider(server);
        this.contract = new ethers.Contract(address, this.abi, this.provider);
    }

    // This should be improved by testing functions like transfer/allowance/approve/transferFrom
    async isErc20() {
        const isErc721 = await this.isErc721();
        if (isErc721) return false;

        if (this._isErc20 !== undefined) return this._isErc20;

        const decimals = await this.decimals();
        const symbol = await this.symbol();
        const name = await this.name();
        const totalSupply = await this.totalSupply();

        this._isErc20 = decimals && symbol && name && totalSupply;

        return this._isErc20;
    }

    async isErc721() {
        if (this._isErc721 !== undefined) return this._isErc721;
        this._isErc721 = await this.has721Interface();
        return this._isErc721;
    }

    async isErc1155() {
        if (this._isErc1155 !== undefined) return this._isErc1155;
        this._isErc1155 = await this.has1155Interface();
        return this._isErc1155;
    }

    async isProxy() {
        try {
            const isErc20 = await this.isErc20();
            if (isErc20 && !abiChecker.isErc20(this.abi))
                return true;
            const isErc721 = await this.isErc721();
            if (isErc721 && !abiChecker.isErc721(this.abi))
                return true;
            const isErc1155 = await this.isErc1155();
            if (isErc1155 && !abiChecker.isErc1155(this.abi))
                return true;
        } catch(error) {
            return false;
        }
    }

    async callReadMethod(method, params, options) {
        try {
            return await withTimeout(this.contract.functions[method](...Object.values(params), options));
        } catch(error) {
            return (error.body ? JSON.parse(error.body).error.message : error.reason) || error.message || "Can't connect to the server";
        }
    }

    async getBytecode() {
        try {
            return await withTimeout(this.provider.getCode(this.contract.address));
        } catch(error) {
            return null;
        }
    }

    async has1155Interface() {
        try {
            return await withTimeout(this.contract.supportsInterface(this.INTERFACE_IDS['1155']));
        } catch(_error) {
            return false;
        }
    }

    async has721Interface() {
        try {
            return await withTimeout(this.contract.supportsInterface(this.INTERFACE_IDS['721']));
        } catch(_error) {
            return false;
        }
    }

    async decimals() {
        try {
            if (this._decimals) return this._decimals;
            this._decimals = await withTimeout(this.contract.decimals());
            return this._decimals;
        } catch(error) {
            return null;
        }
    }

    async symbol() {
        try {
            if (this._symbol) return this._symbol;
            this._symbol = await withTimeout(this.contract.symbol());
            return this._symbol;
        } catch(_error) {
            return null;
        }
    }

    async name() {
        try {
            if (this._name) return this._name;
            this._name = await withTimeout(this.contract.name());
            return this._name;
        } catch(_error) {
            return null;
        }
    }

    async totalSupply() {
        try {
            this._totalSupply = await withTimeout(this.contract.totalSupply());
            return this._totalSupply.toString();
        } catch(error) {
            return null;
        }
    }
}

class ERC721Connector extends ContractConnector {

    constructor(server, address, abi) {
        if (!server || !address) throw '[ERC721Connector] Missing parameter';

        super(server, address, abi || ERC721_ABI.concat(ERC721_METADATA_ABI, ERC721_ENUMERABLE_ABI));
    }

    async tokenByIndex(index) {
        try {
            const res = await withTimeout(this.contract.tokenByIndex(index));
            return res.toString();
        } catch(error) {
            return null;
        }
    }

    ownerOf(tokenId) {
        try {
            return withTimeout(this.contract.ownerOf(tokenId.toString()));
        } catch (error) {
            return null;
        }
    }

    tokenURI(tokenId) {
        try {
            return withTimeout(this.contract.tokenURI(tokenId.toString()));
        } catch(error) {
            return null;
        }
    }

    hasMetadata() {
        try {
            return withTimeout(this.contract.supportsInterface(this.INTERFACE_IDS['721Metadata']));
         } catch(error) {
            return false;
         }
    }

    isEnumerable() {
        try {
            return withTimeout(this.contract.supportsInterface(this.INTERFACE_IDS['721Enumerable']));
        } catch(error) {
            return false;
        }
    }

    async fetchAndStoreAllTokens(workspaceId) {
        const isEnumerable = await this.isEnumerable()
        if (!isEnumerable)
            throw new Error('This method is only available on ERC721 implemeting the Enumerable interface');

        const totalSupply = await this.totalSupply();
        if (!totalSupply)
            throw new Error(`totalSupply() doesn't seem to be implemented. Can't enumerate tokens`);

        const jobs = [];
        for (let i = 0; i < totalSupply; i++) {
            const tokenId = await this.tokenByIndex(i);
            jobs.push({
                name: `reloadErc721Token-${workspaceId}-${this.address}-${tokenId}`,
                data: {
                    workspaceId: workspaceId,
                    address: this.address,
                    tokenId: tokenId
                }
            });
        }
        await bulkEnqueue('reloadErc721Token', jobs);
    }
}

module.exports = {
    ContractConnector: ContractConnector,
    Tracer: Tracer,
    ProviderConnector: ProviderConnector,
    getProvider: getProvider,
    ERC721Connector: ERC721Connector,
    getBalanceChange: getBalanceChange
};

/**
 * @fileoverview Ethereum RPC client connectors and utilities.
 * Provides classes for interacting with blockchain nodes, contracts, and DEXes.
 * Includes transaction tracing, balance queries, and token standard detection.
 * @module lib/rpc
 */

const ethers = require('ethers');
const LRUCache = require('lru-cache');
const { Token, CurrencyAmount, TradeType, Percent } = require('@uniswap/sdk-core');
const { Pair, Trade, Route } = require('@uniswap/v2-sdk');
const { parseTrace, processTrace } = require('./trace');
const { bulkEnqueue } = require('./queue');
const logger = require('./logger');
const { withTimeout, sanitize } = require('../lib/utils');
const abiChecker = require('../lib/contract');

/** Module-level bytecode cache shared across Tracer instances (immutable data) */
const bytecodeCache = new LRUCache({ max: 5000, ttl: 3600000 });

const ERC721_ABI = require('./abis/erc721.json');
const ERC20_ABI = require('./abis/erc20.json');
const IUniswapV2Router02 = require('./abis/IUniswapV2Router02.json');
const IUniswapV2Factory = require('./abis/IUniswapV2Factory.json');
const IUniswapV2Pair = require('./abis/IUniswapV2Pair.json');
const ERC1155_ABI = require('./abis/erc1155.json');
const ERC721_ENUMERABLE_ABI = require('./abis/erc721Enumerable.json');
const ERC721_METADATA_ABI = require('./abis/erc721Metadata.json');
const ALL_ABIS = ERC721_ABI.concat(ERC20_ABI, ERC721_ENUMERABLE_ABI, ERC721_METADATA_ABI, ERC1155_ABI);

/**
 * Gets the native token (ETH) balance change for an address at a specific block.
 *
 * @param {string} address - Ethereum address to check
 * @param {number} blockNumber - Block number to check at
 * @param {string} rpcServer - RPC endpoint URL
 * @returns {Promise<Object>} Balance change details
 * @returns {string} returns.address - The address checked
 * @returns {string} returns.currentBalance - Balance at blockNumber
 * @returns {string} returns.previousBalance - Balance at blockNumber-1
 * @returns {string} returns.diff - Difference between current and previous
 */
const getNativeBalanceChange = async (address, blockNumber, rpcServer) => {
    const provider = new ProviderConnector(rpcServer);
    
    try {
        const [currentBalance, previousBalance] = await Promise.all([
            blockNumber > 0 ? provider.getBalance(address, blockNumber) : Promise.resolve(ethers.BigNumber.from('0')),
            blockNumber > 1 ? provider.getBalance(address, blockNumber - 1) : Promise.resolve(ethers.BigNumber.from('0'))
        ]);

        return {
            address: address,
            currentBalance: currentBalance.toString(),
            previousBalance: previousBalance.toString(),
            diff: currentBalance.sub(previousBalance).toString()
        };
    } catch (error) {
        logger.error('Error getting native balance change', {
            location: 'lib.rpc.getNativeBalanceChange',
            error: error.message,
            address,
            blockNumber
        });
        throw error;
    }
}

/**
 * Gets the ERC20 token balance change for an address at a specific block.
 * @param {string} address - Ethereum address to check
 * @param {string} token - ERC20 token contract address
 * @param {number} blockNumber - Block number to check at
 * @param {string} rpcServer - RPC endpoint URL
 * @returns {Promise<Object>} Balance change details with currentBalance, previousBalance, diff
 */
const getBalanceChange = async (address, token, blockNumber, rpcServer) => {
    const abi = ['function balanceOf(address owner) view returns (uint256)'];
    const contract = new ContractConnector(rpcServer, token, abi);

    const parseBalanceResult = (res) => {
        if (ethers.BigNumber.isBigNumber(res[0]))
            return res[0];
        if (res.startsWith && res.startsWith('call revert exception'))
            return ethers.BigNumber.from('0');
        throw new Error(res);
    };

    try {
        const currentOptions = { from: null, blockTag: blockNumber };
        const previousOptions = { from: null, blockTag: Math.max(1, parseInt(blockNumber) - 1) };

        const [currentRes, previousRes] = await Promise.all([
            contract.callReadMethod('balanceOf(address)', { 0: address }, currentOptions),
            blockNumber > 1
                ? contract.callReadMethod('balanceOf(address)', { 0: address }, previousOptions)
                : Promise.resolve([ethers.BigNumber.from('0')])
        ]);

        const currentBalance = parseBalanceResult(currentRes);
        const previousBalance = parseBalanceResult(previousRes);

        return {
            address: address,
            currentBalance: currentBalance.toString(),
            previousBalance: previousBalance.toString(),
            diff: currentBalance.sub(previousBalance).toString()
        };
    } catch(error) {
        logger.error('Error getting balance change', {
            location: 'lib.rpc.getBalanceChange',
            error: error.message,
            address,
            token,
            blockNumber
        });
        throw error;
    }
}

/** @type {Object<string, ethers.providers.Provider>} Cache of provider instances by URL */
let providers = {};

/**
 * Gets or creates a cached ethers provider for an RPC URL.
 * Supports HTTP, HTTPS, WS, and WSS protocols with optional basic auth.
 *
 * @param {string} url - RPC endpoint URL
 * @returns {ethers.providers.JsonRpcProvider|ethers.providers.WebSocketProvider} Provider instance
 */
const getProvider = function(url) {
    if (providers[url])
        return providers[url];

    const rpcServer = new URL(url);

    let provider;
    if (rpcServer.protocol == 'http:' || rpcServer.protocol == 'https:') {
        provider = ethers.providers.JsonRpcProvider;
    }
    else if (rpcServer.protocol == 'ws:' || rpcServer.protocol == 'wss:') {
        provider = ethers.providers.WebSocketProvider;
    }

    // WebSocketProvider expects a URL string, JsonRpcProvider expects ConnectionInfo
    if (provider === ethers.providers.WebSocketProvider) {
        // For WebSocket, always use the original URL as it can contain embedded credentials
        providers[url] = new provider(url);
    } else {
        let connectionInfo = {
            url: rpcServer.username.length || rpcServer.password.length ?
                rpcServer.origin : url,
            timeout: 8000, // Set RPC timeout to 8 seconds (less than withTimeout default)
            throttleLimit: 1 // Fail fast on rate limiting instead of retrying silently
        };

        // Add authentication if present
        if (rpcServer.username.length || rpcServer.password.length) {
            connectionInfo.user = rpcServer.username;
            connectionInfo.password = rpcServer.password;
        }

        providers[url] = new provider(connectionInfo);
    }
    return providers[url];
};

/**
 * Connector for Uniswap V2 Factory contracts.
 * Provides methods to query pair information.
 *
 * @class DexFactoryConnector
 */
class DexFactoryConnector {
    constructor(server, address) {
        if (!server || !address)
            throw new Error('Missing parameters');

        this.provider = getProvider(server);
        this.contract = new ethers.Contract(address, IUniswapV2Factory, this.provider);
    }

    allPairs(index) {
        return withTimeout(this.contract.allPairs(index));
    }

    allPairsLength() {
        return withTimeout(this.contract.allPairsLength());
    }

    token0Of(pairAddress) {
        const contract = new ethers.Contract(pairAddress, IUniswapV2Pair, this.provider);
        return withTimeout(contract.token0());
    }

    token1Of(pairAddress) {
        const contract = new ethers.Contract(pairAddress, IUniswapV2Pair, this.provider);
        return withTimeout(contract.token1());
    }
}

/**
 * Connector for Uniswap V2 Router contracts.
 *
 * @class DexConnector
 */
class DexConnector {
    constructor(server, address) {
        if (!server || !address)
            throw new Error('Missing parameters');

        this.contract = new ethers.Contract(address, IUniswapV2Router02, getProvider(server));
    }

    getFactory() {
        return withTimeout(this.contract.factory());
    }
}

/**
 * Wallet connector for sending transactions.
 * Used primarily for faucet functionality.
 *
 * @class WalletConnector
 */
class WalletConnector {
    constructor(server, privateKey) {
        if (!server || !privateKey)
            throw new Error('Missing parameters');

        this.wallet = new ethers.Wallet(privateKey, getProvider(server));
    }

    send(to, value) {
        return this.wallet.sendTransaction({ to, value: ethers.BigNumber.from(value) });
    }
}

/**
 * Provider connector for basic blockchain queries.
 * Supports rate limiting and provides methods for fetching blocks, transactions, and balances.
 *
 * @class ProviderConnector
 */
class ProviderConnector {
    /**
     * Creates a ProviderConnector instance.
     *
     * @param {string} server - RPC endpoint URL
     * @param {Object} [limiter] - Optional rate limiter instance
     */
    constructor(server, limiter) {
        if (!server) throw '[ProviderConnector] Missing server parameter';
        this.server = server; // Store original URL for batch requests
        this.provider = getProvider(server);
        this.limiter = limiter;
    }

    /**
     * Get fetch options for the RPC URL, including auth headers if needed
     * @returns {Object} - { url, headers }
     */
    _getFetchOptions() {
        const rpcUrl = new URL(this.server);
        const headers = { 'Content-Type': 'application/json' };

        // Handle basic auth from URL credentials
        if (rpcUrl.username || rpcUrl.password) {
            const auth = Buffer.from(`${rpcUrl.username}:${rpcUrl.password}`).toString('base64');
            headers['Authorization'] = `Basic ${auth}`;
        }

        return { url: rpcUrl.origin + rpcUrl.pathname + rpcUrl.search, headers };
    }

    getBalance(address, block = 'latest') {
        return withTimeout(this.provider.getBalance(address, block));
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

        try {
            const res = await withTimeout(this.provider.send('eth_getBlockByNumber', [`0x${blockNumber.toString(16)}`, true]));
            return res ? sanitize(res) : null;
        } catch (error) {
            // Handle RPC provider limitations gracefully

            // Rate limiting
            if (error.error && error.error.code === -32005) {
                logger.warn('RPC rate limited during block fetch', {
                    blockNumber,
                    error: error.error.message
                });
                throw new Error('Rate limited');
            }

            // Block size/complexity limits
            if (error.error && error.error.code === -32603) {
                const message = error.error.message || '';
                if (message.includes('too many transactions') ||
                    message.includes('block too large') ||
                    message.includes('block size limit')) {
                    logger.warn('RPC provider block size limit exceeded', {
                        blockNumber,
                        error: error.error.message
                    });
                    return null; // Return null so blockSync can handle gracefully
                }
            }

            // Handle ethers.js response processing errors for large blocks
            if (error.message && error.message.includes('processing response error')) {
                logger.warn('Ethers.js failed to process large block response', {
                    blockNumber,
                    error: error.message
                });
                return null; // Return null so blockSync can handle gracefully
            }

            // Re-throw other errors
            throw error;
        }
    }

    async fetchBlockWithTransactions(blockNumber) {
        try {
            return await withTimeout(this.provider.getBlockWithTransactions(blockNumber));
        } catch(error) {
            return await this.fetchRawBlockWithTransaction(blockNumber);
        }
    }

    async fetchTransactionReceipt(transactionHash) {
        await this.checkRateLimit();

        const rawTransaction = await withTimeout(this.provider.send('eth_getTransactionReceipt', [transactionHash]));
        return sanitize(rawTransaction);
    }

    /**
     * Fetch multiple transaction receipts in a single JSON-RPC batch request.
     * Falls back to sequential fetching if batch request fails.
     * @param {string[]} transactionHashes - Array of transaction hashes
     * @returns {Promise<Object[]>} - Array of receipts (null for any that failed)
     */
    async fetchTransactionReceiptsBatch(transactionHashes) {
        if (!transactionHashes || transactionHashes.length === 0) return [];

        // Rate limit check counts as 1 HTTP request (batch is a single HTTP call to the provider)
        await this.checkRateLimit();

        const batchRequest = transactionHashes.map((hash, i) => ({
            jsonrpc: '2.0',
            id: i,
            method: 'eth_getTransactionReceipt',
            params: [hash]
        }));

        try {
            // Check if fetch is available (Node 18+)
            if (typeof fetch === 'undefined') {
                throw new Error('fetch not available');
            }

            // Use helper to get URL and auth headers
            const { url, headers } = this._getFetchOptions();
            const httpResponse = await withTimeout(
                fetch(url, {
                    method: 'POST',
                    headers,
                    body: JSON.stringify(batchRequest)
                })
            );

            if (!httpResponse.ok) {
                throw new Error(`Batch RPC request failed with status ${httpResponse.status}`);
            }

            const response = await httpResponse.json();

            // Validate the response is an array (batch JSON-RPC should return an array)
            if (!Array.isArray(response)) {
                throw new Error('Batch RPC response is not an array');
            }

            // Map results by id for safe ordering regardless of response order
            const resultsById = new Map(response.map(r => [r.id, r]));
            return transactionHashes.map((hash, i) => {
                const r = resultsById.get(i);
                if (!r) return null;
                if (r.error) {
                    logger.warn('RPC error in batch receipt result', { id: i, hash, error: r.error });
                    return null;
                }
                return r.result ? sanitize(r.result) : null;
            });
        } catch (error) {
            // Fallback: fetch sequentially if batch fails
            logger.info('Batch receipt fetch failed, falling back to sequential', { error: error.message });
            const receipts = [];
            for (const hash of transactionHashes) {
                try {
                    const receipt = await this.fetchTransactionReceipt(hash);
                    receipts.push(receipt);
                } catch (e) {
                    receipts.push(null);
                }
            }
            return receipts;
        }
    }

    async fetchNetworkId() {
        const { chainId } = await withTimeout(this.provider.getNetwork());
        return chainId;
    }
}

/**
 * Transaction tracer for debugging and call tracing.
 * Supports both Geth-style (callTracer) and other node tracing formats.
 *
 * @class Tracer
 */
class Tracer {

    #ERRORS_TO_IGNORE = [-32601, -32000, -32005];

    constructor(server, db, type = 'other') {
        if (!server) throw '[Tracer] Missing parameter';
        this.provider = getProvider(server);
        this.db = db;
        this.type = type;
        this.parsedTrace = [];
        this.error = null;
    }

    #handleError(error) {
        if (error.status >= 400)
            return this.error = {
                message: `Http status code ${error.status}`,
                error:  error
            };

        if (error.error && this.#ERRORS_TO_IGNORE.includes(error.error.code))
            return this.error = {
                code: `Error code "${error.error.code}".`,
                message: error.error.message,
                error: error
            };

        // Handle -32603 (Internal error) selectively - only ignore block size/complexity limits
        if (error.error && error.error.code === -32603) {
            const message = error.error.message || '';
            if (message.includes('too many transactions') ||
                message.includes('block too large') ||
                message.includes('block size limit')) {
                return this.error = {
                    code: `Error code "${error.error.code}".`,
                    message: error.error.message,
                    error: error
                };
            }
        }

        throw error;
    }

    process(transaction) {
        if (this.type == 'geth')
            return this.processGeth(transaction);

        return this.processOther(transaction);
    }

    async recursiveTraceParser(step, depth = 1) {
        let bytecode = bytecodeCache.get(step.to);
        if (!bytecode) {
            bytecode = await withTimeout(this.provider.getCode(step.to));
            bytecodeCache.set(step.to, bytecode);
        }
        this.parsedTrace.push(sanitize({
            value: step.value,
            op: step.type,
            address: step.to,
            input: step.input,
            returnData: step.output,
            depth: depth,
            contractHashedBytecode: bytecode != '0x' ? ethers.utils.keccak256(bytecode) : null
        }))
        if (step.calls) {
            for (const call of step.calls) {
                await this.recursiveTraceParser(call, depth + 1);
            }
        }
    }

    async processGeth(transaction) {
        try {
            this.transaction = transaction;
            const rawTrace = await withTimeout(this.provider.send('debug_traceTransaction', [transaction.hash, { "tracer": "callTracer", "tracerConfig": { "withLog": true }}]));
            if (!rawTrace.calls)
                return;
            for (let call of rawTrace.calls)
                await this.recursiveTraceParser(call);
        } catch(error) {
            this.#handleError(error);
        }
    }

    async processOther(transaction) {
        try {
            this.transaction = transaction;
            const rawTrace = await withTimeout(this.provider.send('debug_traceTransaction', [transaction.hash]));
            if (!rawTrace)
                return null;
            this.parsedTrace = await parseTrace(transaction.from, rawTrace, this.provider);
        } catch(error) {
            this.#handleError(error);
        }
    }

    async saveTrace(userId, workspace) {
        try {
            if (Array.isArray(this.parsedTrace))
                await processTrace(userId, workspace, this.transaction.hash, this.parsedTrace, this.db);
            else
                return this.error = {
                    message: 'Invalid trace',
                    trace: this.parsedTrace
                };
        } catch(error) {
            throw error;
        }
    }
}

/**
 * General-purpose smart contract connector.
 * Provides methods for detecting token standards, reading contract state,
 * and interacting with ERC20/ERC721/ERC1155 contracts.
 *
 * @class ContractConnector
 */
class ContractConnector {

    /** ERC165 interface IDs for token standard detection */
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

/**
 * Specialized connector for ERC721 NFT contracts.
 * Extends ContractConnector with NFT-specific methods like tokenURI and enumeration.
 *
 * @class ERC721Connector
 * @extends ContractConnector
 */
class ERC721Connector extends ContractConnector {

    /**
     * Creates an ERC721Connector instance.
     *
     * @param {string} server - RPC endpoint URL
     * @param {string} address - NFT contract address
     * @param {Array<Object>} [abi] - Optional custom ABI
     */
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
    WalletConnector: WalletConnector,
    DexConnector: DexConnector,
    DexFactoryConnector: DexFactoryConnector,
    getBalanceChange: getBalanceChange,
    getNativeBalanceChange: getNativeBalanceChange
};

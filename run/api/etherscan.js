/**
 * @fileoverview Etherscan-compatible read endpoints (internal rewrite targets).
 * Requests reach these routes through the `/api?module=...&action=...` dispatcher
 * (see lib/etherscanDispatch). The explorer is resolved from the host or the `apikey`
 * param, then re-checked as public. Every response is HTTP 200 with the Etherscan envelope
 * `{ status, message, result }`.
 * @module api/etherscan
 *
 * @route GET /account/balance - Native balance of an address
 * @route GET /account/balancemulti - Native balances of up to 20 addresses
 * @route GET /account/txlist - Transactions sent from or to an address
 * @route GET /transaction/getstatus - Execution status of a transaction
 * @route GET /transaction/gettxreceiptstatus - Receipt status of a transaction
 * @route GET /block/getblocknumberbytime - Block number closest to a timestamp
 * @route GET /logs/getLogs - Logs emitted by a contract in a block range
 */

const express = require('express');
const router = express.Router();
const db = require('../lib/firebase');
const logger = require('../lib/logger');
const { ProviderConnector } = require('../lib/rpc');
const { withTimeout } = require('../lib/utils');
const { resolvePublicExplorer, loadPublicWorkspace } = require('../lib/publicExplorer');

const ADDRESS_REGEX = /^0x[0-9a-fA-F]{40}$/;
const HASH_REGEX = /^0x[0-9a-fA-F]{64}$/;
const INTEGER_REGEX = /^\d{1,15}$/;
const DEFAULT_PAGE = 1;
const DEFAULT_OFFSET = 100;
const MAX_OFFSET = 1000;
const MAX_WINDOW = 10000;
const MAX_LOG_RANGE = 10000;
const MAX_BALANCE_ADDRESSES = 20;
const MAX_BLOCK_NUMBER = 2147483647;
const RPC_TIMEOUT_MS = 15000;

/**
 * Error carrying a message that is returned to the caller in the Etherscan envelope.
 */
class EtherscanError extends Error {}

/**
 * Sends an Etherscan success envelope.
 * @param {Object} res - Express response
 * @param {*} result - Result payload
 * @returns {Object} Express response
 */
const ok = (res, result) => res.status(200).json({ status: '1', message: 'OK', result });

/**
 * Sends an Etherscan error envelope (HTTP 200).
 * @param {Object} res - Express response
 * @param {string} result - Error text
 * @returns {Object} Express response
 */
const notOk = (res, result) => res.status(200).json({ status: '0', message: 'NOTOK', result });

/**
 * Wraps an action handler: resolves and re-checks the public explorer, then converts
 * thrown errors into the Etherscan error envelope.
 * @param {string} location - Name used in logs
 * @param {Function} handler - Async function `({ params, workspace, res }) => Object` returning the response
 * @returns {Function} Express handler
 */
const action = (location, handler) => async (req, res) => {
    const params = { ...(req.body || {}), ...(req.query || {}) };

    try {
        const resolved = await resolvePublicExplorer(req, params);
        const workspace = resolved ? await loadPublicWorkspace(resolved) : null;
        if (!workspace)
            return notOk(res, 'Invalid API key or explorer not found');

        return await handler({ params, workspace, res });
    } catch (error) {
        if (error instanceof EtherscanError)
            return notOk(res, error.message);

        logger.error(error.message, { location: `get.api.etherscan.${location}`, error });
        return notOk(res, 'Internal server error');
    }
};

/**
 * Reads a parameter as a string. Missing and empty values are `undefined`; arrays and
 * objects are stringified so that validation rejects them instead of silently using a default.
 * @param {Object} params - Request parameters
 * @param {string} name - Parameter name
 * @returns {string|undefined} The value, or undefined when absent
 */
const str = (params, name) => {
    const value = params[name];
    if (value === undefined || value === null || value === '')
        return undefined;
    return typeof value === 'string' ? value : String(value);
};

/**
 * Validates and lowercases an address parameter.
 * @param {string} value - Raw value
 * @returns {string} Lowercase address
 * @throws {EtherscanError} If invalid
 */
const parseAddress = (value) => {
    if (!value || !ADDRESS_REGEX.test(value))
        throw new EtherscanError('Invalid address format');
    return value.toLowerCase();
};

/**
 * Validates and lowercases a transaction hash parameter.
 * @param {string} value - Raw value
 * @returns {string} Lowercase hash
 * @throws {EtherscanError} If invalid
 */
const parseHash = (value) => {
    if (!value || !HASH_REGEX.test(value))
        throw new EtherscanError('Invalid transaction hash format');
    return value.toLowerCase();
};

/**
 * Parses an optional non-negative integer parameter.
 * @param {string|undefined} value - Raw value
 * @param {number} fallback - Value used when absent
 * @param {string} errorMessage - Error text when invalid
 * @returns {number} Parsed integer
 * @throws {EtherscanError} If present and not a non-negative integer
 */
const parseInteger = (value, fallback, errorMessage) => {
    if (value === undefined)
        return fallback;
    if (!INTEGER_REGEX.test(value))
        throw new EtherscanError(errorMessage);
    return Number(value);
};

/**
 * Parses and validates `page`, `offset` and `sort`.
 * @param {Object} params - Request parameters
 * @returns {{page: number, offset: number, sort: string}} Pagination
 * @throws {EtherscanError} If invalid or the result window is too large
 */
const parsePagination = (params) => {
    const page = parseInteger(str(params, 'page'), DEFAULT_PAGE, 'Invalid page or offset');
    const offset = parseInteger(str(params, 'offset'), DEFAULT_OFFSET, 'Invalid page or offset');
    if (page < 1 || offset < 1 || offset > MAX_OFFSET)
        throw new EtherscanError('Invalid page or offset');
    if (page * offset > MAX_WINDOW)
        throw new EtherscanError('Result window is too large, PageNo x Offset size must be less than or equal to 10000');

    const sort = str(params, 'sort') || 'asc';
    if (!['asc', 'desc'].includes(sort))
        throw new EtherscanError(`Invalid sort value. Use 'asc' or 'desc'`);

    return { page, offset, sort };
};

/**
 * Validates the `tag` parameter (only `latest` is supported).
 * @param {Object} params - Request parameters
 * @throws {EtherscanError} If another tag is requested
 */
const checkTag = (params) => {
    const tag = str(params, 'tag');
    if (tag !== undefined && tag !== 'latest')
        throw new EtherscanError(`Invalid tag. Only 'latest' is supported`);
};

/**
 * Fetches a native balance through the explorer's RPC.
 * @param {Object} workspace - Public workspace
 * @param {string} address - Lowercase address
 * @returns {Promise<string>} Balance in wei, decimal string
 * @throws {EtherscanError} If the RPC call fails
 */
const fetchBalance = async (workspace, address) => {
    try {
        const provider = new ProviderConnector(workspace.rpcServer);
        const balance = await withTimeout(provider.getBalance(address), RPC_TIMEOUT_MS);
        return balance.toString();
    } catch (error) {
        logger.warn('etherscan balance RPC call failed', { location: 'get.api.etherscan.balance', workspaceId: workspace.id, error: error.message });
        throw new EtherscanError('Unable to fetch balance from the RPC server');
    }
};

/**
 * Converts a value to a decimal string, or "" if unavailable.
 * @param {*} value - Value
 * @returns {string} Decimal string or ""
 */
const dec = (value) => value === null || value === undefined ? '' : String(value);

/**
 * Converts a number or decimal string to a hex quantity string, or "" if unavailable.
 * @param {*} value - Value
 * @returns {string} Hex string ("0x...") or ""
 */
const hex = (value) => {
    if (value === null || value === undefined || value === '')
        return '';
    try {
        return `0x${BigInt(value).toString(16)}`;
    } catch (_error) {
        return '';
    }
};

/**
 * Returns the first 4 bytes of transaction input.
 * @param {string} input - Transaction input
 * @returns {string} Method id, or "0x" if the input is shorter than 4 bytes
 */
const methodId = (input) => typeof input === 'string' && input.length >= 10 ? input.slice(0, 10) : '0x';

/**
 * Formats a transaction row as an Etherscan txlist object.
 * @param {Object} row - Row from getEtherscanTransactions
 * @param {number|null} latestBlockNumber - Latest indexed block number
 * @returns {Object} txlist object
 */
const formatTransaction = (row, latestBlockNumber) => ({
    blockNumber: dec(row.blockNumber),
    timeStamp: dec(row.timeStamp),
    hash: row.hash,
    nonce: dec(row.nonce),
    blockHash: dec(row.blockHash),
    transactionIndex: dec(row.transactionIndex),
    from: dec(row.from),
    to: dec(row.to),
    value: dec(row.value),
    gas: dec(row.gas),
    gasPrice: dec(row.gasPrice),
    isError: row.receiptId && row.status === false ? '1' : '0',
    txreceipt_status: row.receiptId && row.status !== null && row.status !== undefined ? (row.status ? '1' : '0') : '',
    input: dec(row.input),
    contractAddress: dec(row.contractAddress).toLowerCase(),
    cumulativeGasUsed: dec(row.cumulativeGasUsed),
    gasUsed: dec(row.gasUsed),
    confirmations: latestBlockNumber === null ? '' : String(Math.max(latestBlockNumber - row.blockNumber, 0)),
    methodId: methodId(row.input),
    functionName: dec(row.methodSignature)
});

/**
 * Formats a log row as an Etherscan getLogs object (hex quantities).
 * @param {Object} row - Row from getEtherscanLogs
 * @returns {Object} Log object
 */
const formatLog = (row) => ({
    address: dec(row.address),
    topics: Array.isArray(row.topics) ? row.topics : [],
    data: row.data || '0x',
    blockNumber: hex(row.blockNumber),
    timeStamp: hex(row.timeStamp),
    gasPrice: hex(row.gasPrice),
    gasUsed: hex(row.gasUsed),
    logIndex: hex(row.logIndex),
    transactionHash: dec(row.transactionHash),
    transactionIndex: hex(row.transactionIndex)
});

router.get('/account/balance', action('account.balance', async ({ params, workspace, res }) => {
    const address = parseAddress(str(params, 'address'));
    checkTag(params);

    return ok(res, await fetchBalance(workspace, address));
}));

router.get('/account/balancemulti', action('account.balancemulti', async ({ params, workspace, res }) => {
    const raw = str(params, 'address');
    if (!raw)
        throw new EtherscanError('Invalid address format');
    const addresses = raw.split(',').map(a => a.trim());
    if (addresses.length > MAX_BALANCE_ADDRESSES)
        throw new EtherscanError(`Maximum ${MAX_BALANCE_ADDRESSES} addresses per request`);
    const parsed = addresses.map(parseAddress);
    checkTag(params);

    const balances = await Promise.all(parsed.map(address => fetchBalance(workspace, address)));
    return ok(res, parsed.map((account, index) => ({ account, balance: balances[index] })));
}));

router.get('/account/txlist', action('account.txlist', async ({ params, workspace, res }) => {
    const address = parseAddress(str(params, 'address'));
    const { page, offset, sort } = parsePagination(params);
    const startBlock = Math.min(parseInteger(str(params, 'startblock'), 0, 'Invalid startblock or endblock'), MAX_BLOCK_NUMBER);
    const endBlock = Math.min(parseInteger(str(params, 'endblock'), MAX_BLOCK_NUMBER, 'Invalid startblock or endblock'), MAX_BLOCK_NUMBER);

    const rows = await db.getEtherscanTransactions(workspace.id, { address, startBlock, endBlock, sort, page, offset });
    if (!rows.length)
        return res.status(200).json({ status: '0', message: 'No transactions found', result: [] });

    const latest = await db.getLatestIndexedBlock(workspace.id);
    const latestBlockNumber = latest ? latest.number : null;
    return ok(res, rows.map(row => formatTransaction(row, latestBlockNumber)));
}));

router.get('/transaction/getstatus', action('transaction.getstatus', async ({ params, workspace, res }) => {
    const hash = parseHash(str(params, 'txhash'));

    const transaction = await db.getEtherscanTransactionStatus(workspace.id, hash);
    if (!transaction)
        throw new EtherscanError('Transaction not found');

    const failed = !!transaction.receiptId && transaction.status === false;
    return ok(res, { isError: failed ? '1' : '0', errDescription: transaction.parsedError || '' });
}));

router.get('/transaction/gettxreceiptstatus', action('transaction.gettxreceiptstatus', async ({ params, workspace, res }) => {
    const hash = parseHash(str(params, 'txhash'));

    const transaction = await db.getEtherscanTransactionStatus(workspace.id, hash);
    if (!transaction)
        throw new EtherscanError('Transaction not found');

    const hasStatus = !!transaction.receiptId && transaction.status !== null && transaction.status !== undefined;
    return ok(res, { status: hasStatus ? (transaction.status ? '1' : '0') : '' });
}));

router.get('/block/getblocknumberbytime', action('block.getblocknumberbytime', async ({ params, workspace, res }) => {
    const rawTimestamp = str(params, 'timestamp');
    if (!rawTimestamp || !INTEGER_REGEX.test(rawTimestamp))
        throw new EtherscanError('Invalid timestamp');
    const closest = str(params, 'closest');
    if (!['before', 'after'].includes(closest))
        throw new EtherscanError(`Invalid closest value. Use 'before' or 'after'`);

    const blockNumber = await db.getClosestBlockNumber(workspace.id, Number(rawTimestamp), closest);
    if (blockNumber === null || blockNumber === undefined)
        throw new EtherscanError('No closest block found');

    return ok(res, String(blockNumber));
}));

router.get('/logs/getLogs', action('logs.getLogs', async ({ params, workspace, res }) => {
    const address = parseAddress(str(params, 'address'));
    const fromBlock = parseInteger(str(params, 'fromBlock'), undefined, 'Invalid fromBlock or toBlock');
    const toBlock = parseInteger(str(params, 'toBlock'), undefined, 'Invalid fromBlock or toBlock');
    if (fromBlock === undefined || toBlock === undefined)
        throw new EtherscanError('Invalid fromBlock or toBlock');
    if (toBlock < fromBlock)
        throw new EtherscanError('Invalid block range, toBlock must be greater than or equal to fromBlock');
    if (toBlock - fromBlock > MAX_LOG_RANGE)
        throw new EtherscanError(`Block range is too large, toBlock - fromBlock must be less than or equal to ${MAX_LOG_RANGE}`);

    const topics = [0, 1, 2, 3].map(index => {
        const topic = str(params, `topic${index}`);
        if (topic === undefined)
            return null;
        if (!HASH_REGEX.test(topic))
            throw new EtherscanError('Invalid topic format');
        return topic.toLowerCase();
    });
    const { page, offset, sort } = parsePagination(params);

    const rows = await db.getEtherscanLogs(workspace.id, {
        address,
        fromBlock: Math.min(fromBlock, MAX_BLOCK_NUMBER),
        toBlock: Math.min(toBlock, MAX_BLOCK_NUMBER),
        topics,
        sort,
        page,
        offset
    });
    if (!rows.length)
        return res.status(200).json({ status: '0', message: 'No records found', result: [] });

    return ok(res, rows.map(formatLog));
}));

module.exports = router;

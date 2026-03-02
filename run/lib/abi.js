/**
 * @fileoverview ABI encoding/decoding utilities for Ethereum smart contracts.
 * Provides functions for detecting token standards, decoding logs and transactions,
 * and extracting token transfer information.
 * @module lib/abi
 */

const ethers = require('ethers');
const { stringifyBns } = require('./utils');

const SELECTORS = require('./abis/selectors.json');
const abis = {
    erc20: require('./abis/erc20.json'),
    erc721: require('./abis/erc721.json')
};
const IUniswapV2Pair = require('./abis/IUniswapV2Pair.json')

/**
 * Checks if an ABI contains a specific function with matching input types.
 *
 * @param {Array<Object>} abi - Contract ABI array
 * @param {string} name - Function name to find
 * @param {string[]} inputs - Array of input types (e.g., ['address', 'uint256'])
 * @returns {boolean} True if function exists with matching signature
 */
function hasFn(abi, name, inputs) {
    return abi.some(
      (item) =>
        item.type === 'function' &&
        item.name === name &&
        JSON.stringify(item.inputs.map(i => i.type)) === JSON.stringify(inputs)
    );
}

/**
 * Detects which ERC token standard(s) a contract implements based on its ABI.
 *
 * @param {Array<Object>} abi - Contract ABI array
 * @returns {Object} Detection results
 * @returns {boolean} returns.isERC20 - True if implements ERC20
 * @returns {boolean} returns.isERC721 - True if implements ERC721
 * @returns {boolean} returns.isERC1155 - True if implements ERC1155
 */
const detectStandard = (abi) => {
    const isERC20 =
      hasFn(abi, 'totalSupply', []) &&
      hasFn(abi, 'balanceOf', ['address']) &&
      hasFn(abi, 'transfer', ['address', 'uint256']) &&
      hasFn(abi, 'approve', ['address', 'uint256']) &&
      hasFn(abi, 'allowance', ['address', 'address']);
  
    const isERC721 =
      hasFn(abi, 'balanceOf', ['address']) &&
      hasFn(abi, 'ownerOf', ['uint256']) &&
      hasFn(abi, 'approve', ['address', 'uint256']) &&
      hasFn(abi, 'getApproved', ['uint256']) &&
      hasFn(abi, 'setApprovalForAll', ['address', 'bool']) &&
      hasFn(abi, 'isApprovedForAll', ['address', 'address']) &&
      hasFn(abi, 'transferFrom', ['address', 'address', 'uint256']);
  
    const isERC1155 =
      hasFn(abi, 'balanceOf', ['address', 'uint256']) &&
      hasFn(abi, 'balanceOfBatch', ['address[]', 'uint256[]']) &&
      hasFn(abi, 'setApprovalForAll', ['address', 'bool']) &&
      hasFn(abi, 'isApprovedForAll', ['address', 'address']) &&
      hasFn(abi, 'safeTransferFrom', ['address', 'address', 'uint256', 'uint256', 'bytes']) &&
      hasFn(abi, 'safeBatchTransferFrom', ['address', 'address', 'uint256[]', 'uint256[]', 'bytes']);
  
    return { isERC20, isERC721, isERC1155 };
}

/**
 * Extracts Uniswap V2 pool reserves from a Sync event log.
 *
 * @param {Object} log - Transaction log object
 * @param {string[]} log.topics - Log topics array
 * @param {string} log.data - Log data
 * @returns {Object|null} Reserve amounts or null if not a Sync event
 * @returns {string} returns.reserve0 - Reserve of token0
 * @returns {string} returns.reserve1 - Reserve of token1
 */
const getV2PoolReserves = (log) => {
    if (log.topics[0] == '0x1c411e9a96e071241c2f21f7726b17ae89e3cab4c78be50e062b03a9fffbbad1') {
        const decoded = decodeLog(log, IUniswapV2Pair);
        return stringifyBns({
            reserve0: decoded.args.reserve0,
            reserve1: decoded.args.reserve1
        });
    }

    return null;
};

/**
 * Finds the ABI that contains a given function selector.
 * Searches through known ABIs (ERC20, ERC721) for matching function.
 *
 * @param {string} signature - Function selector (first 10 chars of calldata, e.g., '0xa9059cbb')
 * @returns {Array<Object>|undefined} Matching ABI array or undefined if not found
 */
const findAbiForFunction = (signature) => {
    const patterns = Object.keys(SELECTORS);

    for (let i = 0; i < patterns.length; i++) {
        const pattern = patterns[i];
        const idx = SELECTORS[pattern].functions.indexOf(signature);
        if (idx > -1) {
            return abis[pattern];
        }
    }
};

/**
 * Decodes a transaction log using the provided ABI.
 * Attempts standard parsing first, then tries each event in the ABI.
 *
 * @param {Object} log - Transaction log object
 * @param {string[]} log.topics - Log topics array
 * @param {string} log.data - Log data
 * @param {Array<Object>} abi - Contract ABI array
 * @returns {ethers.utils.LogDescription|undefined} Decoded log or undefined if decoding fails
 */
const decodeLog = (log, abi) => {
    const ethersInterface = new ethers.utils.Interface(abi);
    let decodedLog;

    try {
        decodedLog = ethersInterface.parseLog(log);
    }
    catch(error) {
        for (const event in ethersInterface.events) {
            try {
                const eventTopic = ethersInterface.getEventTopic(event)
                const fragment = ethersInterface.getEvent(eventTopic);
                decodedLog = new ethers.utils.LogDescription({
                    eventFragment: fragment,
                    name: fragment.name,
                    signature: fragment.format(),
                    topic: ethersInterface.getEventTopic(fragment),
                    args: ethersInterface.decodeEventLog(fragment, log.data, log.topics)
                });
            } catch(_) {
                continue;
            }
        }
    }

    return decodedLog;
};

/**
 * Extracts token transfer information from a Transfer event log.
 * Handles both ERC20 and ERC721 Transfer events.
 *
 * @param {Object} transactionLog - Transaction log object
 * @param {string[]} transactionLog.topics - Log topics (topic[0] must be Transfer signature)
 * @param {string} transactionLog.address - Token contract address
 * @param {string} transactionLog.data - Log data
 * @returns {Object|null} Token transfer details or null if not a Transfer event
 * @returns {string} returns.token - Token contract address
 * @returns {string} returns.src - Source address (from)
 * @returns {string} returns.dst - Destination address (to)
 * @returns {string} returns.amount - Transfer amount (1 for ERC721)
 * @returns {string|null} returns.tokenId - Token ID for ERC721, null for ERC20
 */
const getTokenTransfer = (transactionLog) => {
    try {
        if (transactionLog.topics[0] == '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef') {
            let decodedLog;
            for (const [pattern, abi] of Object.entries(abis)) {
                decodedLog = decodeLog(transactionLog, abi);
                if (decodedLog) break;
            }

            if (decodedLog) {
                return stringifyBns({
                    token: transactionLog.address,
                    src: decodedLog.args.from,
                    dst: decodedLog.args.to,
                    amount: decodedLog.args.amount || ethers.BigNumber.from('1'),
                    tokenId: decodedLog.args.tokenId || null
                });
            }
        }
        return null;
    } catch(error) {
        return null;
    }
};

/**
 * Extracts method name, signature, and formatted label from transaction calldata.
 * Attempts to decode using provided ABI or known function selectors.
 *
 * @param {Object} transaction - Transaction object
 * @param {string} transaction.data - Transaction calldata
 * @param {Array<Object>} [abi] - Optional contract ABI for decoding
 * @returns {Object} Method details
 * @returns {string} [returns.name] - Function name
 * @returns {string} [returns.label] - Formatted function call with arguments
 * @returns {string} [returns.signature] - Function signature
 * @returns {string} [returns.sighash] - Function selector if decoding fails
 */
const getTransactionMethodDetails = (transaction, abi) => {
    try {
        const contractAbi = abi ? abi : findAbiForFunction(transaction.data.slice(0, 10))

        if (!contractAbi)
            return transaction.data.length > 10 ? {
                sighash: transaction.data.slice(0, 10)
            } : {};

        const jsonInterface = new ethers.utils.Interface(contractAbi);
        const parsedTransactionData = jsonInterface.parseTransaction(transaction);
        const fragment = parsedTransactionData.functionFragment;

        const label = [`${fragment.name}(`];
        const inputsLabel = [];
        for (let i = 0; i < fragment.inputs.length; i ++) {
            const input = fragment.inputs[i];
            const param = [];
            param.push(input.type)
            if (input.name)
                param.push(` ${input.name}`);
            if (parsedTransactionData.args[i] !== undefined && parsedTransactionData.args[i] !== null)
                param.push(`: ${parsedTransactionData.args[i]}`)
            inputsLabel.push(param.join(''));
        }

        if (inputsLabel.length > 1)
            label.push('\n\t');

        label.push(inputsLabel.join(',\n\t'));

        if (inputsLabel.length > 1)
            label.push('\n');

        label.push(')');

        return {
            name: parsedTransactionData.name,
            label: label.join(''),
            signature: `${fragment.name}(` + fragment.inputs.map((input) => `${input.type} ${input.name}`).join(', ') + ')'
        };
    } catch(_error) {
        return transaction.data.length > 10 ? {
            sighash: transaction.data.slice(0, 10)
        } : {};
    }
};

module.exports = {
    decodeLog: decodeLog,
    getTokenTransfer: getTokenTransfer,
    getTransactionMethodDetails: getTransactionMethodDetails,
    findAbiForFunction: findAbiForFunction,
    getV2PoolReserves: getV2PoolReserves,
    detectStandard: detectStandard
};

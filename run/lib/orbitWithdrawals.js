/**
 * @fileoverview Arbitrum Orbit L2→L1 withdrawal utilities.
 * Handles withdrawal detection, data extraction, and claim transaction generation.
 * @module lib/orbitWithdrawals
 */

const { ethers } = require('ethers');
const { encodeFunctionData } = require('viem');

const { ContractConnector } = require('./rpc');

const { NODE_INTERFACE_ADDRESS } = require('../constants/orbit.js');

const OUTBOX_ABI = require('../lib/abis/orbitOutbox.json');
const iface = new ethers.utils.Interface(require('../lib/abis/arbsys.json'));
const nodeInterfaceIface = new ethers.utils.Interface(require('../lib/abis/orbitNodeInterface.json'));
const outboxIface = new ethers.utils.Interface(require('../lib/abis/orbitOutbox.json'));
const finalizeInboundTransferIface = new ethers.utils.Interface(require('../lib/abis/finalizeInboundTransfer.json'));

/**
 * Retrieves token symbol and decimals for a withdrawal.
 * @param {string} tokenAddress - Token contract address
 * @param {Object} provider - Ethers provider
 * @returns {Promise<{tokenSymbol: string|null, tokenDecimals: number|null}>} Token info
 */
const getWithdrawalTokenInfo = async (tokenAddress, provider) => {
    try {
        const contract = new ContractConnector(provider, tokenAddress);
        const tokenSymbol = await contract.symbol();
        const tokenDecimals = await contract.decimals();
        return { tokenSymbol, tokenDecimals };
    } catch (e) {
        return { tokenSymbol: null, tokenDecimals: null };
    }
};

/**
 * Constructs a Merkle proof for claiming a withdrawal on L1.
 * @param {number} size - Size of the Merkle tree
 * @param {number} messageId - L2→L1 message ID
 * @param {Object} provider - Ethers provider connected to L2
 * @returns {Promise<Array<string>>} Merkle proof array
 */
const constructOutboxProof = async (size, messageId, provider) => {
    const contract = new ethers.Contract(NODE_INTERFACE_ADDRESS, nodeInterfaceIface, provider);

    const res = await contract.constructOutboxProof(size, messageId);

    return res.proof;
}

/**
 * Extracts data from an OutBoxTransactionExecuted event.
 * @param {Object} log - Transaction log containing the event
 * @returns {Object} Parsed execution data with to, l2Sender, transactionIndex
 */
const getOutboxTransactionExecutedData = (log) => {
    const parsedLog = outboxIface.parseLog({ topics: log.topics, data: log.data });
    return {
        to: parsedLog.args.to,
        l2Sender: parsedLog.args.l2Sender,
        transactionIndex: parsedLog.args.transactionIndex
    };
}

/**
 * Checks if a log is an OutBoxTransactionExecuted event.
 * @param {Object} log - Transaction log object
 * @returns {boolean} True if log is an outbox execution event
 */
const isOutboxTransactionExecutedLog = (log) => {
    try {
        const parsedLog = outboxIface.parseLog({ topics: log.topics, data: log.data });
        return parsedLog.name === 'OutBoxTransactionExecuted';
    } catch (e) {
        return false;
    }
}

/**
 * Generates the transaction data for claiming a withdrawal on L1.
 * @param {number} messageNumber - L2→L1 message number
 * @param {number} size - Merkle tree size for proof construction
 * @param {Object} transaction - Original withdrawal transaction
 * @param {Object} log - L2ToL1Tx event log
 * @returns {Promise<string>} Encoded executeTransaction call data
 */
const getClaimTransactionData = async (messageNumber, size, transaction, log) => {
    const provider = transaction.workspace.getProvider().provider;

    const parsedLog = getWithdrawalData(log, transaction);
    const proof = await constructOutboxProof(size, messageNumber, provider);

    const args = [
        proof,
        messageNumber,
        parsedLog.caller,
        parsedLog.destination,
        parsedLog.arbBlockNum.toString(),
        parsedLog.ethBlockNum.toString(),
        parsedLog.timestamp.toString(),
        parsedLog.callvalue.toString(),
        parsedLog.logData
    ]

    return encodeFunctionData({
        abi: OUTBOX_ABI,
        functionName: 'executeTransaction',
        args
    });
}

/**
 * Checks if a log is an L2ToL1Tx withdrawal event.
 * @param {Object} log - Transaction log object
 * @returns {boolean} True if log is a withdrawal event
 */
const isWithdrawalLog = (log) => {
    try {
        const withdrawalTopic = iface.getEventTopic('L2ToL1Tx');
        return log.topics[0] === withdrawalTopic;
    } catch (e) {
        return false;
    }
};

/**
 * Extracts withdrawal data from an L2ToL1Tx event.
 * Handles both ETH withdrawals and token bridge withdrawals.
 * @param {Object} log - Transaction log containing the event
 * @returns {Object} Parsed withdrawal data including destination, amount, and token info
 */
const getWithdrawalData = (log) => {
    const parsedLog = iface.parseLog(log);

    if (parsedLog.args.data === '0x') {
        return {
            caller: parsedLog.args.caller,
            destination: parsedLog.args.destination,
            hash: parsedLog.args.hash.toString(),
            position: parseInt(parsedLog.args.position.toString()),
            arbBlockNum: parseInt(parsedLog.args.arbBlockNum.toString()),
            ethBlockNum: parseInt(parsedLog.args.ethBlockNum.toString()),
            timestamp: parseInt(parsedLog.args.timestamp.toString()),
            amount: parsedLog.args.callvalue.toString(),
            data: parsedLog.args.data
        }
    }
    else {
        const parsedLogData = finalizeInboundTransferIface.parseTransaction({ data: parsedLog.args.data });

        return {
            caller: parsedLog.args.caller,
            destination: parsedLog.args.destination,
            hash: parsedLog.args.hash.toString(),
            position: parseInt(parsedLog.args.position.toString()),
            arbBlockNum: parseInt(parsedLog.args.arbBlockNum.toString()),
            ethBlockNum: parseInt(parsedLog.args.ethBlockNum.toString()),
            timestamp: parseInt(parsedLog.args.timestamp.toString()),
            callvalue: parsedLog.args.callvalue.toString(),
            data: parsedLog.args.data,
            l1Token: parsedLogData.args._token,
            to: parsedLogData.args._to,
            amount: parsedLogData.args._amount.toString()
        }
    }
}

module.exports = {
    isWithdrawalLog,
    getWithdrawalData,
    getClaimTransactionData,
    isOutboxTransactionExecutedLog,
    getOutboxTransactionExecutedData,
    getWithdrawalTokenInfo
};

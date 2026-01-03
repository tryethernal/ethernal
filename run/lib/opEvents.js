/**
 * @fileoverview OP Stack event detection and parsing.
 * Handles TransactionDeposited, DisputeGameCreated, and OutputProposed events.
 * @module lib/opEvents
 */

const { ethers } = require('ethers');

// Event signatures - keccak256 of event signature
const EVENT_SIGNATURES = {
    // TransactionDeposited(address indexed from, address indexed to, uint256 indexed version, bytes opaqueData)
    TRANSACTION_DEPOSITED: '0xb3813568d9991fc951961fcb4c784893574240a28925604d09fc577c55bb7c32',

    // DisputeGameCreated(address indexed disputeProxy, uint32 indexed gameType, bytes32 indexed rootClaim)
    DISPUTE_GAME_CREATED: '0x5b565efe82411da98814f356d0e7bcb8f0c5b2c3f9e9b6b4d7f2e4e3b7b8c9a1',

    // OutputProposed(bytes32 indexed outputRoot, uint256 indexed l2OutputIndex, uint256 indexed l2BlockNumber, uint256 l1Timestamp)
    OUTPUT_PROPOSED: '0xa7aaf2512769da4e444e3de247be2564225c2e7a8f74cfe528e46e17d24868e2'
};

// Compute actual signatures to verify
const computeEventSignature = (signature) => {
    return ethers.utils.id(signature);
};

// Verify and update signatures (for debugging)
const COMPUTED_SIGNATURES = {
    TRANSACTION_DEPOSITED: computeEventSignature('TransactionDeposited(address,address,uint256,bytes)'),
    DISPUTE_GAME_CREATED: computeEventSignature('DisputeGameCreated(address,uint32,bytes32)'),
    OUTPUT_PROPOSED: computeEventSignature('OutputProposed(bytes32,uint256,uint256,uint256)')
};

/**
 * Parse TransactionDeposited event data
 * @param {Object} log - Event log object
 * @returns {Object} Parsed deposit data
 */
const parseTransactionDeposited = (log) => {
    // Topics: [signature, from, to, version]
    const from = '0x' + log.topics[1].slice(26);
    const to = '0x' + log.topics[2].slice(26);
    const version = parseInt(log.topics[3], 16);

    // Decode opaqueData from data field
    // opaqueData format: mint (32 bytes) + value (32 bytes) + gasLimit (8 bytes) + isCreation (1 byte) + data (variable)
    const data = log.data;

    let mint = '0';
    let value = '0';
    let gasLimit = '0';
    let isCreation = false;
    let calldata = '0x';

    if (data && data.length >= 2) {
        try {
            // Remove 0x prefix
            const hexData = data.slice(2);

            // For version 0 opaqueData:
            // - 32 bytes: mint
            // - 32 bytes: value
            // - 8 bytes: gas
            // - 1 byte: isCreation
            // - remaining: data
            if (hexData.length >= 146) { // 64 + 64 + 16 + 2 = 146 chars minimum
                mint = BigInt('0x' + hexData.slice(0, 64)).toString();
                value = BigInt('0x' + hexData.slice(64, 128)).toString();
                gasLimit = BigInt('0x' + hexData.slice(128, 144)).toString();
                isCreation = hexData.slice(144, 146) === '01';
                if (hexData.length > 146) {
                    calldata = '0x' + hexData.slice(146);
                }
            }
        } catch (e) {
            // If parsing fails, use defaults
        }
    }

    return {
        from,
        to: to === '0x0000000000000000000000000000000000000000' ? null : to,
        version,
        mint,
        value,
        gasLimit,
        isCreation,
        data: calldata
    };
};

/**
 * Parse DisputeGameCreated event data
 * @param {Object} log - Event log object
 * @returns {Object} Parsed dispute game data
 */
const parseDisputeGameCreated = (log) => {
    // Topics: [signature, disputeProxy, gameType, rootClaim]
    const disputeProxy = '0x' + log.topics[1].slice(26);
    const gameType = parseInt(log.topics[2], 16);
    const rootClaim = log.topics[3];

    return {
        disputeGameAddress: disputeProxy,
        gameType,
        outputRoot: rootClaim
    };
};

/**
 * Parse OutputProposed event data (legacy L2OutputOracle)
 * @param {Object} log - Event log object
 * @returns {Object} Parsed output data
 */
const parseOutputProposed = (log) => {
    // Topics: [signature, outputRoot, l2OutputIndex, l2BlockNumber]
    // Data: [l1Timestamp]
    const outputRoot = log.topics[1];
    const outputIndex = parseInt(log.topics[2], 16);
    const l2BlockNumber = parseInt(log.topics[3], 16);

    let l1Timestamp = null;
    if (log.data && log.data.length >= 66) {
        l1Timestamp = parseInt(log.data.slice(0, 66), 16);
    }

    return {
        outputRoot,
        outputIndex,
        l2BlockNumber,
        l1Timestamp
    };
};

/**
 * Check if log is a TransactionDeposited event
 * @param {Object} log - Event log object
 * @param {string} optimismPortalAddress - OptimismPortal contract address
 * @returns {boolean}
 */
const isTransactionDepositedEvent = (log, optimismPortalAddress) => {
    if (!log.topics || log.topics.length < 4) return false;
    if (!log.address || !optimismPortalAddress) return false;

    return log.address.toLowerCase() === optimismPortalAddress.toLowerCase() &&
           log.topics[0].toLowerCase() === COMPUTED_SIGNATURES.TRANSACTION_DEPOSITED.toLowerCase();
};

/**
 * Check if log is a DisputeGameCreated event
 * @param {Object} log - Event log object
 * @param {string} disputeGameFactoryAddress - DisputeGameFactory contract address
 * @returns {boolean}
 */
const isDisputeGameCreatedEvent = (log, disputeGameFactoryAddress) => {
    if (!log.topics || log.topics.length < 4) return false;
    if (!log.address || !disputeGameFactoryAddress) return false;

    return log.address.toLowerCase() === disputeGameFactoryAddress.toLowerCase() &&
           log.topics[0].toLowerCase() === COMPUTED_SIGNATURES.DISPUTE_GAME_CREATED.toLowerCase();
};

/**
 * Check if log is an OutputProposed event
 * @param {Object} log - Event log object
 * @param {string} l2OutputOracleAddress - L2OutputOracle contract address
 * @returns {boolean}
 */
const isOutputProposedEvent = (log, l2OutputOracleAddress) => {
    if (!log.topics || log.topics.length < 4) return false;
    if (!log.address || !l2OutputOracleAddress) return false;

    return log.address.toLowerCase() === l2OutputOracleAddress.toLowerCase() &&
           log.topics[0].toLowerCase() === COMPUTED_SIGNATURES.OUTPUT_PROPOSED.toLowerCase();
};

module.exports = {
    EVENT_SIGNATURES: COMPUTED_SIGNATURES,
    parseTransactionDeposited,
    parseDisputeGameCreated,
    parseOutputProposed,
    isTransactionDepositedEvent,
    isDisputeGameCreatedEvent,
    isOutputProposedEvent
};

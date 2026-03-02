/**
 * @fileoverview Arbitrum Orbit rollup node event parsing utilities.
 * Detects and extracts data from NodeCreated, NodeConfirmed, and NodeRejected events.
 * Supports both classic Arbitrum and BOLD protocol events.
 * @module lib/orbitNodes
 */

const { ethers } = require('ethers');

const iface = new ethers.utils.Interface(require('../lib/abis/orbitRollup.json'));
const boldIface = new ethers.utils.Interface(require('../lib/abis/orbitBoldRollup.json'));

/**
 * Checks if a log is a NodeCreated or AssertionCreated event.
 * @param {Object} log - Transaction log object
 * @returns {boolean} True if log is a node creation event
 */
const isOrbitNodeCreatedLog = (log) => {
    const nodeCreatedTopic = iface.getEventTopic('NodeCreated');
    const boldNodeCreatedTopic = boldIface.getEventTopic('AssertionCreated');

    return log.topics[0] === nodeCreatedTopic || log.topics[0] === boldNodeCreatedTopic;
};

/**
 * Checks if a log is a NodeConfirmed or AssertionConfirmed event.
 * @param {Object} log - Transaction log object
 * @returns {boolean} True if log is a node confirmation event
 */
const isOrbitNodeConfirmedLog = (log) => {
    const nodeConfirmedTopic = iface.getEventTopic('NodeConfirmed');
    const boldNodeConfirmedTopic = boldIface.getEventTopic('AssertionConfirmed');

    return log.topics[0] === nodeConfirmedTopic || log.topics[0] === boldNodeConfirmedTopic;
};

/**
 * Checks if a log is a NodeRejected event.
 * @param {Object} log - Transaction log object
 * @returns {boolean} True if log is a node rejection event
 */
const isOrbitNodeRejectedLog = (log) => {
    const nodeRejectedTopic = iface.getEventTopic('NodeRejected');

    return log.topics[0] === nodeRejectedTopic;
};

/**
 * Extracts node data from a NodeCreated or AssertionCreated event.
 * @param {Object} log - Transaction log containing the event
 * @returns {Object} Parsed node data including nodeNum, hashes, and status
 */
const getOrbitCreatedNodeData = (log) => {
    let parsed;
    try {
        parsed = iface.parseLog({ topics: log.topics, data: log.data });
    } catch (error) {
        parsed = boldIface.parseLog({ topics: log.topics, data: log.data });
    }

    const args = parsed.args;
    return {
        nodeNum: args.nodeNum ? String(args.nodeNum) : null,
        parentNodeHash: args.parentNodeHash || args.parentAssertionHash,
        nodeHash: args.nodeHash || args.assertionHash,
        afterInboxBatchAcc: args.afterInboxBatchAcc,
        wasmModuleRoot: args.wasmModuleRoot,
        inboxMaxCount: args.inboxMaxCount,
        createdTxHash: log.transactionHash,
        confirmed: false,
        rejected: false
    };
};

/**
 * Extracts node data from a NodeConfirmed or AssertionConfirmed event.
 * @param {Object} log - Transaction log containing the event
 * @returns {Object} Parsed confirmation data including blockHash and sendRoot
 */
const getOrbitConfirmedNodeData = (log) => {
    let parsed;
    try {
        parsed = iface.parseLog({ topics: log.topics, data: log.data });
    } catch (error) {
        parsed = boldIface.parseLog({ topics: log.topics, data: log.data });
    }

    const args = parsed.args;
    return {
        nodeNum: args.nodeNum ? String(args.nodeNum) : null,
        nodeHash: args.assertionHash,
        confirmedBlockHash: args.blockHash,
        confirmedSendRoot: args.sendRoot
    };
};

module.exports = {
    isOrbitNodeCreatedLog,
    isOrbitNodeConfirmedLog,
    isOrbitNodeRejectedLog,
    getOrbitCreatedNodeData,
    getOrbitConfirmedNodeData
};

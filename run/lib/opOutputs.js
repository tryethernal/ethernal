const { ethers } = require('ethers');

const l2OutputOracleAbi = require('./abis/l2OutputOracle.json');
const disputeGameFactoryAbi = require('./abis/disputeGameFactory.json');

const l2OutputOracleIface = new ethers.utils.Interface(l2OutputOracleAbi);
const disputeGameFactoryIface = new ethers.utils.Interface(disputeGameFactoryAbi);

/**
 * Check if a log is an OutputProposed event from L2OutputOracle (legacy)
 * @param {Object} log - The log to check
 * @returns {boolean}
 */
const isOutputProposedLog = (log) => {
    try {
        const outputProposedTopic = l2OutputOracleIface.getEventTopic('OutputProposed');
        return log.topics[0] === outputProposedTopic;
    } catch (e) {
        return false;
    }
};

/**
 * Check if a log is a DisputeGameCreated event from DisputeGameFactory (modern/fault proofs)
 * @param {Object} log - The log to check
 * @returns {boolean}
 */
const isDisputeGameCreatedLog = (log) => {
    try {
        const disputeGameCreatedTopic = disputeGameFactoryIface.getEventTopic('DisputeGameCreated');
        return log.topics[0] === disputeGameCreatedTopic;
    } catch (e) {
        return false;
    }
};

/**
 * Get data from an OutputProposed log (legacy)
 * @param {Object} log - The log to parse
 * @returns {Object} Parsed output data
 */
const getOutputProposedData = (log) => {
    const parsedLog = l2OutputOracleIface.parseLog({ topics: log.topics, data: log.data });

    return {
        outputRoot: parsedLog.args.outputRoot,
        l2OutputIndex: parsedLog.args.l2OutputIndex.toString(),
        l2BlockNumber: parsedLog.args.l2BlockNumber.toString(),
        l1Timestamp: parsedLog.args.l1Timestamp.toString()
    };
};

/**
 * Get data from a DisputeGameCreated log (modern/fault proofs)
 * @param {Object} log - The log to parse
 * @returns {Object} Parsed dispute game data
 */
const getDisputeGameCreatedData = (log) => {
    const parsedLog = disputeGameFactoryIface.parseLog({ topics: log.topics, data: log.data });

    return {
        disputeProxy: parsedLog.args.disputeProxy.toLowerCase(),
        gameType: parsedLog.args.gameType,
        rootClaim: parsedLog.args.rootClaim
    };
};

/**
 * Calculate the challenge period end timestamp
 * Default is 7 days for mainnet, but can be configured
 * @param {number} proposalTimestamp - Unix timestamp when output was proposed
 * @param {number} challengePeriodSeconds - Challenge period in seconds (default 7 days)
 * @returns {number} Unix timestamp when challenge period ends
 */
const calculateChallengePeriodEnd = (proposalTimestamp, challengePeriodSeconds = 604800) => {
    return proposalTimestamp + challengePeriodSeconds;
};

module.exports = {
    isOutputProposedLog,
    isDisputeGameCreatedLog,
    getOutputProposedData,
    getDisputeGameCreatedData,
    calculateChallengePeriodEnd
};

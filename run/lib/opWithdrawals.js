const { ethers } = require('ethers');

const optimismPortalAbi = require('./abis/optimismPortal.json');
const l2ToL1MessagePasserAbi = require('./abis/l2ToL1MessagePasser.json');

const optimismPortalIface = new ethers.utils.Interface(optimismPortalAbi);
const l2ToL1MessagePasserIface = new ethers.utils.Interface(l2ToL1MessagePasserAbi);

/**
 * Check if a log is a MessagePassed event from L2ToL1MessagePasser (L2)
 * This event is emitted when a withdrawal is initiated on L2
 * @param {Object} log - The log to check
 * @returns {boolean}
 */
const isMessagePassedLog = (log) => {
    try {
        const messagePassedTopic = l2ToL1MessagePasserIface.getEventTopic('MessagePassed');
        return log.topics[0] === messagePassedTopic;
    } catch (e) {
        return false;
    }
};

/**
 * Check if a log is a WithdrawalProven event from OptimismPortal (L1)
 * This event is emitted when a withdrawal proof is submitted
 * @param {Object} log - The log to check
 * @returns {boolean}
 */
const isWithdrawalProvenLog = (log) => {
    try {
        const withdrawalProvenTopic = optimismPortalIface.getEventTopic('WithdrawalProven');
        return log.topics[0] === withdrawalProvenTopic;
    } catch (e) {
        return false;
    }
};

/**
 * Check if a log is a WithdrawalFinalized event from OptimismPortal (L1)
 * This event is emitted when a withdrawal is finalized/claimed
 * @param {Object} log - The log to check
 * @returns {boolean}
 */
const isWithdrawalFinalizedLog = (log) => {
    try {
        const withdrawalFinalizedTopic = optimismPortalIface.getEventTopic('WithdrawalFinalized');
        return log.topics[0] === withdrawalFinalizedTopic;
    } catch (e) {
        return false;
    }
};

/**
 * Get data from a MessagePassed log (L2 withdrawal initiation)
 * @param {Object} log - The log to parse
 * @returns {Object|null} Parsed withdrawal initiation data or null if parsing fails
 */
const getMessagePassedData = (log) => {
    try {
        const parsedLog = l2ToL1MessagePasserIface.parseLog({ topics: log.topics, data: log.data });

        return {
            nonce: parsedLog.args.nonce.toString(),
            sender: parsedLog.args.sender.toLowerCase(),
            target: parsedLog.args.target.toLowerCase(),
            value: parsedLog.args.value.toString(),
            gasLimit: parsedLog.args.gasLimit.toString(),
            data: parsedLog.args.data,
            withdrawalHash: parsedLog.args.withdrawalHash
        };
    } catch (error) {
        console.error('Error parsing MessagePassed log:', error.message);
        return null;
    }
};

/**
 * Get data from a WithdrawalProven log (L1)
 * @param {Object} log - The log to parse
 * @returns {Object|null} Parsed withdrawal proven data or null if parsing fails
 */
const getWithdrawalProvenData = (log) => {
    try {
        const parsedLog = optimismPortalIface.parseLog({ topics: log.topics, data: log.data });

        return {
            withdrawalHash: parsedLog.args.withdrawalHash,
            from: parsedLog.args.from.toLowerCase(),
            to: parsedLog.args.to.toLowerCase()
        };
    } catch (error) {
        console.error('Error parsing WithdrawalProven log:', error.message);
        return null;
    }
};

/**
 * Get data from a WithdrawalFinalized log (L1)
 * @param {Object} log - The log to parse
 * @returns {Object|null} Parsed withdrawal finalized data or null if parsing fails
 */
const getWithdrawalFinalizedData = (log) => {
    try {
        const parsedLog = optimismPortalIface.parseLog({ topics: log.topics, data: log.data });

        return {
            withdrawalHash: parsedLog.args.withdrawalHash,
            success: parsedLog.args.success
        };
    } catch (error) {
        console.error('Error parsing WithdrawalFinalized log:', error.message);
        return null;
    }
};

/**
 * L2ToL1MessagePasser predeploy address (same on all OP Stack chains)
 */
const L2_TO_L1_MESSAGE_PASSER_ADDRESS = '0x4200000000000000000000000000000000000016';

module.exports = {
    isMessagePassedLog,
    isWithdrawalProvenLog,
    isWithdrawalFinalizedLog,
    getMessagePassedData,
    getWithdrawalProvenData,
    getWithdrawalFinalizedData,
    L2_TO_L1_MESSAGE_PASSER_ADDRESS
};

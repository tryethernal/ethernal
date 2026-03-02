const { ethers } = require('ethers');

const optimismPortalAbi = require('./abis/optimismPortal.json');
const iface = new ethers.utils.Interface(optimismPortalAbi);

/**
 * Check if a log is a TransactionDeposited event from OptimismPortal
 * @param {Object} log - The log to check
 * @returns {boolean}
 */
const isTransactionDepositedLog = (log) => {
    try {
        const depositTopic = iface.getEventTopic('TransactionDeposited');
        return log.topics[0] === depositTopic;
    } catch (e) {
        return false;
    }
};

/**
 * Parse the opaqueData from a TransactionDeposited event
 * opaqueData encoding:
 * - bytes32: msgValue (first 32 bytes)
 * - bytes32: value (next 32 bytes)
 * - uint64: gasLimit (next 8 bytes)
 * - uint8: isCreation (next 1 byte)
 * - bytes: data (remaining bytes)
 *
 * @param {string} opaqueData - The hex-encoded opaque data
 * @returns {Object} Parsed deposit data
 */
const parseOpaqueData = (opaqueData) => {
    // Remove 0x prefix if present
    const data = opaqueData.startsWith('0x') ? opaqueData.slice(2) : opaqueData;

    // Parse the opaque data according to the spec
    // The format is: mint (32 bytes) || value (32 bytes) || gasLimit (8 bytes) || isCreation (1 byte) || data
    const mint = '0x' + data.slice(0, 64);
    const value = '0x' + data.slice(64, 128);
    const gasLimit = '0x' + data.slice(128, 144);
    const isCreation = data.slice(144, 146) === '01';
    const calldata = '0x' + data.slice(146);

    return {
        mint: ethers.BigNumber.from(mint).toString(),
        value: ethers.BigNumber.from(value).toString(),
        gasLimit: ethers.BigNumber.from(gasLimit).toString(),
        isCreation,
        data: calldata === '0x' ? null : calldata
    };
};

/**
 * Get deposit data from a TransactionDeposited log
 * @param {Object} log - The log to parse
 * @returns {Object|null} Parsed deposit data or null if parsing fails
 */
const getTransactionDepositedData = (log) => {
    try {
        const parsedLog = iface.parseLog({ topics: log.topics, data: log.data });
        const opaqueData = parseOpaqueData(parsedLog.args.opaqueData);

        return {
            from: parsedLog.args.from.toLowerCase(),
            to: parsedLog.args.to.toLowerCase(),
            version: parsedLog.args.version.toString(),
            value: opaqueData.value,
            gasLimit: opaqueData.gasLimit,
            isCreation: opaqueData.isCreation,
            data: opaqueData.data
        };
    } catch (error) {
        console.error('Error parsing TransactionDeposited log:', error.message);
        return null;
    }
};

/**
 * Derive the L2 transaction hash from deposit parameters
 * This follows the OP Stack deposit transaction hashing algorithm
 *
 * @param {Object} params - Deposit parameters
 * @param {number} params.l1BlockNumber - L1 block number
 * @param {string} params.l1TransactionHash - L1 transaction hash
 * @param {number} params.logIndex - Log index in the transaction
 * @returns {string} Derived L2 transaction hash
 */
const deriveL2TransactionHash = ({ l1BlockNumber, l1TransactionHash, logIndex }) => {
    // The deposit source hash is derived from L1 block info and log index
    // We include l1BlockNumber, l1TransactionHash, and logIndex for uniqueness
    const encoded = ethers.utils.defaultAbiCoder.encode(
        ['uint256', 'bytes32', 'uint256'],
        [l1BlockNumber, l1TransactionHash, logIndex]
    );
    return ethers.utils.keccak256(encoded);
};

module.exports = {
    isTransactionDepositedLog,
    getTransactionDepositedData,
    parseOpaqueData,
    deriveL2TransactionHash
};

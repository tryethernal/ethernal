const { ethers } = require('ethers');

const iface = new ethers.utils.Interface(require('../lib/abis/orbitRollup.json'));

const isOrbitNodeCreatedLog = (log) => {
    const nodeCreatedTopic = iface.getEventTopic('NodeCreated');
    return log.topics[0] === nodeCreatedTopic;
};

const isOrbitNodeConfirmedLog = (log) => {
    const nodeConfirmedTopic = iface.getEventTopic('NodeConfirmed');
    return log.topics[0] === nodeConfirmedTopic;
};

const isOrbitNodeRejectedLog = (log) => {
    const nodeRejectedTopic = iface.getEventTopic('NodeRejected');
    return log.topics[0] === nodeRejectedTopic;
};

const getOrbitCreatedNodeData = (log) => {
    const parsed = iface.parseLog({ topics: log.topics, data: log.data });
    const args = parsed.args;
    return {
        nodeNum: String(args.nodeNum),
        parentNodeHash: String(args.parentNodeHash),
        nodeHash: String(args.nodeHash),
        executionHash: String(args.executionHash),
        afterInboxBatchAcc: String(args.afterInboxBatchAcc),
        wasmModuleRoot: String(args.wasmModuleRoot),
        inboxMaxCount: args.inboxMaxCount ? String(args.inboxMaxCount) : null,
        createdTxHash: log.transactionHash,
        confirmed: false,
        rejected: false
    };
};

const getOrbitConfirmedNodeData = (log) => {
    const parsed = iface.parseLog({ topics: log.topics, data: log.data });
    const args = parsed.args;
    return {
        confirmed: true,
        nodeNum: String(args.nodeNum),
        confirmedBlockHash: String(args.blockHash),
        confirmedSendRoot: String(args.sendRoot)
    };
};

module.exports = {
    isOrbitNodeCreatedLog,
    isOrbitNodeConfirmedLog,
    isOrbitNodeRejectedLog,
    getOrbitCreatedNodeData,
    getOrbitConfirmedNodeData
};
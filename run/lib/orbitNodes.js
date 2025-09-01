const { ethers } = require('ethers');

const iface = new ethers.utils.Interface(require('../lib/abis/orbitRollup.json'));
const boldIface = new ethers.utils.Interface(require('../lib/abis/orbitBoldRollup.json'));

const isOrbitNodeCreatedLog = (log) => {
    const nodeCreatedTopic = iface.getEventTopic('NodeCreated');
    const boldNodeCreatedTopic = boldIface.getEventTopic('AssertionCreated');

    return log.topics[0] === nodeCreatedTopic || log.topics[0] === boldNodeCreatedTopic;
};

const isOrbitNodeConfirmedLog = (log) => {
    const nodeConfirmedTopic = iface.getEventTopic('NodeConfirmed');
    const boldNodeConfirmedTopic = boldIface.getEventTopic('AssertionConfirmed');

    return log.topics[0] === nodeConfirmedTopic || log.topics[0] === boldNodeConfirmedTopic;
};

const isOrbitNodeRejectedLog = (log) => {
    const nodeRejectedTopic = iface.getEventTopic('NodeRejected');

    return log.topics[0] === nodeRejectedTopic;
};

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
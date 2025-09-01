const { ethers } = require('ethers');
const iface = new ethers.utils.Interface(require('../lib/abis/orbitSequencerInbox.json'));

const isOrbitBatchDeliveredLog = (log) => {
    try {
        const batchDeliveredTopic = iface.getEventTopic('SequencerBatchDelivered');
        return log.topics[0] === batchDeliveredTopic;
    } catch (e) {
        return false;
    }
};

const getOrbitBatchDeliveredData = (log, transaction) => {
    const parsedLog = iface.parseLog(log);
    const parsedTransaction = iface.parseTransaction(transaction);

    let dataLocation = 'onchain';
    if (parsedLog.args.dataLocation) {
        switch (parsedLog.args.dataLocation) {
            case 0: dataLocation = 'onchain'; break;
            case 1: dataLocation = 'das'; break;
            case 2: dataLocation = 'ipfs'; break;
        }
    }

    return {
        batchSequenceNumber: parsedLog.args.batchSequenceNumber,
        beforeAcc: parsedLog.args.beforeAcc,
        afterAcc: parsedLog.args.afterAcc,
        delayedAcc: parsedLog.args.delayedAcc,
        afterDelayedMessageRead: parsedLog.args.afterDelayedMessageRead,
        prevMessageCount: parsedTransaction.args.prevMessageCount,
        newMessageCount: parsedTransaction.args.newMessageCount.toString(),
        metadata: {
            timebounds: {
                minTimestamp: parsedLog.args.timeBounds.minTimestamp.toString(),
                maxTimestamp: parsedLog.args.timeBounds.maxTimestamp.toString(),
                minBlockNumber: parsedLog.args.timeBounds.minBlockNumber.toString(),
                maxBlockNumber: parsedLog.args.timeBounds.maxBlockNumber.toString()
            }
        },
        batchDataLocation: dataLocation
    };
};

module.exports = {
    isOrbitBatchDeliveredLog,
    getOrbitBatchDeliveredData
};

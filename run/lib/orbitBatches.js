const { ethers } = require('ethers');
const iface = new ethers.utils.Interface(require('../lib/abis/orbitSequencerInbox.json'));

const isOrbitBatchDeliveredLog = (log) => {
    const batchDeliveredTopic = iface.getEventTopic('SequencerBatchDelivered');
    return log.topics[0] === batchDeliveredTopic;
};

const getOrbitBatchDeliveredData = (log, transaction) => {
    const parsedLog = iface.parseLog({ topics: log.topics, data: log.data });
    const parsedTransaction = iface.parseTransaction({ data: transaction.data });

    let dataLocation = 'onchain';
    if (parsedLog.args.dataLocation) {
        switch (parsedLog.args.dataLocation) {
            case 0: dataLocation = 'onchain'; break;
            case 1: dataLocation = 'das'; break;
            case 2: dataLocation = 'ipfs'; break;
        }
    }

    return {
        batchSequenceNumber: String(parsedLog.args.batchSequenceNumber),
        beforeAcc: String(parsedLog.args.beforeAcc),
        afterAcc: String(parsedLog.args.afterAcc),
        delayedAcc: String(parsedLog.args.delayedAcc),
        afterDelayedMessageRead: String(parsedLog.args.afterDelayedMessageRead),
        prevMessageCount: parsedTransaction.args.prevMessageCount.toString(),
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

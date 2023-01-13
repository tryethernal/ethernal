const { enqueue } = require('../lib/queue');
const { getTokenTransfer } = require('../lib/abi');
const models = require('../models');
const { Sequelize } = require('sequelize');
const Op = Sequelize.Op;
const TokenTransfer = models.TokenTransfer;
const TransactionLog = models.TransactionLog;

module.exports = async job => {
    const data = job.data;

    const batchSize = data.batchSize || 10;

    const logs = await TransactionLog.findAll({
        include: ['workspace', 'tokenTransfer'],
        where: {
            topics: {
                [Op.contains]: ['0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef']
            },
            '$tokenTransfer.transactionLogId$': null
        },
        limit: batchSize,
        order: [['id', 'desc']]
    })

    for (let i = 0; i < logs.length; i++) {
        const log = logs[i];
        const tokenTransfer = getTokenTransfer(log);
        if (tokenTransfer)
            await log.safeCreateTokenTransfer(tokenTransfer);
    }

    if (logs.length > 0)
        await enqueue('reprocessAllTokenTransfers', `reprocessAllTokenTransfers-${Date.now()}`, { batchSize: data.batchSize });

    return;
};

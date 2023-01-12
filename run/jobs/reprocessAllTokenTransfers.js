const { enqueue } = require('../lib/queue');
const models = require('../models');

const TokenTransfer = models.TokenTransfer;

module.exports = async job => {
    const data = job.data;

    const batchSize = data.batchSize || 10;

    const transfers = await TokenTransfer.findAll({
        include: 'workspace',
        where: {
            processed: false,
            '$workspace.public$': true
        },
        limit: batchSize,
        order: [['id', 'desc']]
    })

    for (let i = 0; i < transfers.length; i++) {
        const t = transfers[i];
        await enqueue('processTokenTransfer', `reprocessTokenTransfer-${t.id}`, {
            tokenTransferId: t.id,
        }, 100);
    }

    return;
};

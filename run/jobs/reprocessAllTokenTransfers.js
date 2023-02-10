const { enqueue } = require('../lib/queue');
const { getTokenTransfer } = require('../lib/abi');
const models = require('../models');
const sequelize = models.sequelize;
const { Sequelize, QueryTypes } = require('sequelize');
const Op = Sequelize.Op;
const TokenTransfer = models.TokenTransfer;
const TransactionLog = models.TransactionLog;

module.exports = async job => {
    const data = job.data;

    if (!data.workspaceId)
        return false;

    const batchSize = data.batchSize || 10;

    const transfers = await sequelize.query(`
        SELECT distinct token_transfers.id, token_transfers."transactionId", token_transfers.token, token_balance_changes.address, src, dst
        FROM token_transfers
        LEFT OUTER JOIN token_balance_changes ON token_transfers."transactionId" = token_balance_changes."transactionId"
        lEFT JOIN workspaces on token_transfers."workspaceId" = workspaces.id
        WHERE address IS NULL AND token_transfers.processed = false
        AND workspaces.id = :workspaceId
        LIMIT ${batchSize}
    `, {
        replacements: {
            workspaceId: data.workspaceId
        },
        type: QueryTypes.SELECT
    });

    for (let i = 0; i < transfers.length; i++) {
        const transfer = transfers[i];
        await enqueue('processTokenTransfer',
            `processTokenTransferReprocessing-${data.workspaceId}-${transfer.token}-${transfer.id}`, {
                tokenTransferId: transfer.id
            }
        );
    }
    return true;
};

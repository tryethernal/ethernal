/**
 * @fileoverview Transaction trace reprocessing job.
 * Enqueues trace processing for all transactions in a workspace.
 * Uses cursor-based pagination to avoid loading all transactions into memory.
 * @module jobs/reprocessWorkspaceTransactionTraces
 */

const { Op } = require('sequelize');
const { Workspace, Transaction } = require('../models');
const { bulkEnqueue } = require('../lib/queue');

const PAGE_SIZE = 5000;

module.exports = async job => {
    const data = job.data;

    if (!data.workspaceId)
        throw new Error('Missing parameter.');

    const workspace = await Workspace.findByPk(data.workspaceId);

    if (!workspace.public)
        return 'Not allowed on private workspaces';

    let lastId = 0;
    let totalEnqueued = 0;

    while (true) {
        const transactions = await Transaction.findAll({
            where: {
                workspaceId: data.workspaceId,
                id: { [Op.gt]: lastId }
            },
            attributes: ['id', 'hash'],
            order: [['id', 'ASC']],
            limit: PAGE_SIZE
        });

        if (transactions.length === 0) break;

        const batches = transactions.map(tx => ({
            name: `processTransactionTrace-${data.workspaceId}-${tx.hash}`,
            data: { transactionId: tx.id }
        }));

        await bulkEnqueue('processTransactionTrace', batches);
        totalEnqueued += transactions.length;
        lastId = transactions[transactions.length - 1].id;
    }

    return `Enqueued ${totalEnqueued} trace jobs`;
};

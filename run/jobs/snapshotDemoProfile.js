/**
 * @fileoverview Snapshots demo explorer activity counts onto the demo profile
 * before the explorer is deleted. Called during demo cleanup.
 * @module jobs/snapshotDemoProfile
 */
const { DemoProfile, Block, Transaction, TokenTransfer, Contract } = require('../models');
const { sequelize } = require('../models');
const logger = require('../lib/logger');

/**
 * @param {Object} job - BullMQ job
 * @param {string} job.data.email - Demo creator's email
 * @param {number} job.data.workspaceId - Workspace ID for counting
 * @param {Object|null} job.data.enrichment - Explorer enrichment data to copy
 */
module.exports = async (job) => {
    const { email, workspaceId, enrichment } = job.data;

    if (!email || !workspaceId) throw new Error('Missing email or workspaceId for demo profile snapshot');

    const profile = await DemoProfile.findOne({
        where: { email },
        order: [['createdAt', 'DESC']]
    });

    if (!profile) {
        logger.info('No demo profile found for snapshot', { email });
        return;
    }

    const [blockCount, transactionCount, transferCount, contractCount, activeAddressesResult] = await Promise.all([
        Block.count({ where: { workspaceId } }),
        Transaction.count({ where: { workspaceId } }),
        TokenTransfer.count({ where: { workspaceId } }),
        Contract.count({ where: { workspaceId } }),
        sequelize.query(
            `SELECT COUNT(*) AS count FROM (
                SELECT "from" AS addr FROM transactions WHERE "workspaceId" = :workspaceId AND "from" IS NOT NULL
                UNION
                SELECT "to" AS addr FROM transactions WHERE "workspaceId" = :workspaceId AND "to" IS NOT NULL
            ) t`,
            { replacements: { workspaceId }, type: sequelize.QueryTypes.SELECT }
        )
    ]);

    const activeAddresses = parseInt(activeAddressesResult?.[0]?.count || 0, 10);

    await profile.update({
        blockCount,
        transactionCount,
        transferCount,
        contractCount,
        activeAddresses,
        enrichment: enrichment || profile.enrichment,
        explorerDeletedAt: new Date()
    });

    logger.info('Demo profile snapshot captured', { email, blockCount, transactionCount });
};

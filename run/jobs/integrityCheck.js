/*
    This job checks the integrity of a workspace, by using the following.
    Here, "islands" refers to the islands & gap algorithm (See for example: https://medium.com/trendyol-tech/using-sqls-classical-islands-and-gaps-approach-for-data-quality-ddb05e27faa9)
    - Fetch latest block checked and check islands between (latest checked || first stored block) and latest stored
    - If latest checked == latest stored, fetch the latest block from the chain
        - If same than latest stored, then OK do nothing
        - If different & mined less than 2 minutes after latest checked, then OK do nothing (we assume a bit of latency for processing)
        - If different & mined more than 2 minutes after latest checked, enqueue for processing
    - If latest check != latest stored, update latest checked to latest stored

*/

const { Sequelize, QueryTypes } = require('sequelize');

const models = require('../models');
const db = require('../lib/firebase');

const sequelize = models.Sequelize;
const Workspace = models.Workspace;

module.exports = async job => {
    const data = job.data;

    if (!data.workspaceId)
        throw new Error('Missing parameter.');

    const workspace = await Workspace.findOne({
        id: data.workspaceId,
        include: {
            model: 'integrityCheck',
            require: false
        }
    });

    if (!workspace.integrityChecksEnabled)
        return false;

    let lowerBlock;
    if (!integrityCheck) {
        ([lowerBlock] = await workspace.getBlocks({
            order: ['number', 'ASC'],
            limit: 1
        }));
        await db.updateWorkspaceIntegrityCheck(workspace.id, initialBlock.id);
    }
    else {
        lowerBlock = await integrityCheck.getBlock();
    }

    const [upperBlock] = await workspace.getBlocks({
        order: ['number', 'DESC'],
        limit: 1
    });

    if (!lowerBlock || !upperBlock || lowerBlock == upperBlock)
        return false;

    const gaps = await sequelize.query(`
        SELECT
            GENERATE_SERIES(LAG(MAX("number")) OVER (order by group_id) + 1, MIN("number") - 1)
        FROM (
            SELECT
                *,
                "number" - row_number() OVER (ORDER BY "number") as group_id
            FROM blocks
            WHERE "workspaceId" = :workspaceId
            AND number >= :lowerBound
            AND number <= :upperBound
        ) s
        GROUP BY group_id
    `, {
        replacements: {
            workspaceId: workspaceId.id,
            lowerBound: lowerBlock.number,
            upperBound: upperBlock.number
        },
        type: QueryTypes.SELECT
    });

    console.log(gaps);

    return true;
};

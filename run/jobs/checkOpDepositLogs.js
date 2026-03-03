/**
 * @fileoverview OP Stack log listener startup job.
 * Starts PM2 processes to listen for TransactionDeposited events on parent chains.
 * @module jobs/checkOpDepositLogs
 */

const { Op } = require('sequelize');

const PM2 = require('../lib/pm2');
const { getPm2Host, getPm2Secret } = require('../lib/env');
const { OpChainConfig } = require('../models');

module.exports = async () => {
    const opConfigs = await OpChainConfig.findAll({
        where: {
            parentWorkspaceId: { [Op.ne]: null },
            optimismPortalAddress: { [Op.ne]: null }
        },
        include: 'parentWorkspace'
    });

    const newProcesses = [];
    const existingProcesses = [];
    for (const opConfig of opConfigs) {
        // Additional safety check
        if (!opConfig.parentWorkspaceId || !opConfig.optimismPortalAddress)
            continue;

        const pm2 = new PM2(getPm2Host(), getPm2Secret());
        const { data: existingProcess } = await pm2.find(`opLogListener-${opConfig.parentWorkspaceId}`);

        if (existingProcess) {
            existingProcesses.push(opConfig.parentWorkspaceId);
            continue;
        }

        await pm2.startOpLogListener(`opLogListener-${opConfig.parentWorkspaceId}`,
            JSON.stringify({
                parentWorkspaceId: opConfig.parentWorkspaceId,
                workspaceId: opConfig.workspaceId,
                contractAddress: opConfig.optimismPortalAddress
            })
        );
        newProcesses.push(opConfig.parentWorkspaceId);
    }

    return { newProcesses, existingProcesses };
};

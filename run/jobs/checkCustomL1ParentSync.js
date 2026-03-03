/**
 * @fileoverview Ensures PM2 sync processes are running for all custom L1 parent workspaces.
 * Runs periodically to recover from PM2 restarts or process crashes.
 * @module jobs/checkCustomL1ParentSync
 */

const { Op } = require('sequelize');

const PM2 = require('../lib/pm2');
const logger = require('../lib/logger');
const { getPm2Host, getPm2Secret } = require('../lib/env');
const { Workspace, OrbitChainConfig, OpChainConfig } = require('../models');

module.exports = async () => {
    const pm2Host = getPm2Host();
    const pm2Secret = getPm2Secret();

    if (!pm2Host || !pm2Secret)
        return 'PM2 not configured';

    const parentWorkspaces = await Workspace.findAll({
        where: { isCustomL1Parent: true }
    });

    const newProcesses = [];
    const existingProcesses = [];
    const skipped = [];

    for (const workspace of parentWorkspaces) {
        // Check if workspace has any L2 children
        const orbitChildCount = await OrbitChainConfig.count({ where: { parentWorkspaceId: workspace.id } });
        const opChildCount = await OpChainConfig.count({ where: { parentWorkspaceId: workspace.id } });

        if (orbitChildCount === 0 && opChildCount === 0) {
            skipped.push(workspace.id);
            continue;
        }

        const pm2 = new PM2(pm2Host, pm2Secret);
        const slug = `custom-l1-${workspace.id}`;
        const { data: existingProcess } = await pm2.find(slug);

        if (existingProcess) {
            existingProcesses.push(workspace.id);
            continue;
        }

        try {
            await pm2.start(slug, workspace.id);
            newProcesses.push(workspace.id);
            logger.info(`Started sync for custom L1 parent workspace ${workspace.id}`);
        } catch (error) {
            logger.error(`Error starting sync for custom L1 parent ${workspace.id}: ${error.message}`, {
                location: 'jobs.checkCustomL1ParentSync',
                error,
                workspaceId: workspace.id
            });
        }
    }

    return { newProcesses, existingProcesses, skipped };
};

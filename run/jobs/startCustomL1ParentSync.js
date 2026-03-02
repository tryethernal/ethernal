/**
 * @fileoverview Job to start PM2 sync for a custom L1 parent workspace.
 * Called when the first L2 child is linked to a custom L1 parent.
 * @module jobs/startCustomL1ParentSync
 */

const logger = require('../lib/logger');
const PM2 = require('../lib/pm2');
const { Workspace, OrbitChainConfig, OpChainConfig } = require('../models');
const { getPm2Host, getPm2Secret } = require('../lib/env');

/**
 * Starts or ensures sync is running for a custom L1 parent workspace.
 * @param {Object} job - The job object
 * @param {number} job.data.workspaceId - The custom L1 parent workspace ID
 * @returns {Promise<string>} Result message
 */
module.exports = async (job) => {
    const { workspaceId } = job.data;

    if (!workspaceId) {
        throw new Error('Missing workspaceId parameter');
    }

    const workspace = await Workspace.findByPk(workspaceId);

    if (!workspace) {
        logger.info(`Workspace ${workspaceId} not found, skipping sync start`);
        return `Workspace ${workspaceId} not found`;
    }

    if (!workspace.isCustomL1Parent) {
        logger.info(`Workspace ${workspaceId} is not a custom L1 parent, skipping sync start`);
        return `Workspace ${workspaceId} is not a custom L1 parent`;
    }

    // Check if workspace has any L2 children that need it
    const orbitChildCount = await OrbitChainConfig.count({ where: { parentWorkspaceId: workspaceId } });
    const opChildCount = await OpChainConfig.count({ where: { parentWorkspaceId: workspaceId } });

    if (orbitChildCount === 0 && opChildCount === 0) {
        logger.info(`Custom L1 parent ${workspaceId} has no L2 children, skipping sync start`);
        return `No L2 children for workspace ${workspaceId}`;
    }

    const pm2Host = getPm2Host();
    const pm2Secret = getPm2Secret();

    if (!pm2Host || !pm2Secret) {
        logger.warn(`PM2 not configured, cannot start sync for custom L1 parent ${workspaceId}`);
        return 'PM2 not configured';
    }

    const pm2 = new PM2(pm2Host, pm2Secret);

    // Check if sync is already running
    const slug = `custom-l1-${workspaceId}`;
    const { data: existingProcess } = await pm2.find(slug);

    if (existingProcess) {
        logger.info(`Sync already running for custom L1 parent ${workspaceId}`);
        return `Sync already running for workspace ${workspaceId}`;
    }

    try {
        await pm2.start(slug, workspace.id);

        logger.info(`Started sync for custom L1 parent workspace ${workspaceId}`);
        return `Started sync for workspace ${workspaceId}`;
    } catch (error) {
        logger.error(`Error starting sync for custom L1 parent ${workspaceId}: ${error.message}`, {
            location: 'jobs.startCustomL1ParentSync',
            error,
            workspaceId
        });
        throw error;
    }
};

/**
 * @fileoverview Orbit log listener startup job.
 * Starts PM2 processes to listen for bridge events on parent chains.
 * @module jobs/checkOrbitMessageDeliveredLogs
 */

const { Op } = require('sequelize');

const { ORBIT_BRIDGE_MESSAGE_DELIVERED_EVENT_ABI } = require('../constants/orbit');
const PM2 = require('../lib/pm2');
const { getPm2Host, getPm2Secret } = require('../lib/env');
const { OrbitChainConfig } = require('../models');

module.exports = async () => {
    const orbitConfigs = await OrbitChainConfig.findAll({
        where: {
            parentWorkspaceId: { [Op.ne]: null }
        },
        include: 'parentWorkspace'
    });

    const newProcesses = [];
    const existingProcesses = [];
    for (const orbitConfig of orbitConfigs) {
        // Additional safety check to ensure parentWorkspaceId is valid
        if (!orbitConfig.parentWorkspaceId) {
            continue;
        }

        const pm2 = new PM2(getPm2Host(), getPm2Secret());
        const { data: existingProcess } = await pm2.find(`logListener-${orbitConfig.parentWorkspaceId}`);

        if (existingProcess) {
            existingProcesses.push(orbitConfig.parentWorkspaceId);
            continue;
        }

        await pm2.startLogListener(`logListener-${orbitConfig.parentWorkspaceId}`,
            JSON.stringify({
                parentWorkspaceId: orbitConfig.parentWorkspaceId,
                workspaceId: orbitConfig.workspaceId,
                contractAddress: orbitConfig.bridgeContract,
                abiFilter: JSON.stringify(ORBIT_BRIDGE_MESSAGE_DELIVERED_EVENT_ABI)
            })
        );
        newProcesses.push(orbitConfig.parentWorkspaceId);
    }

    return { newProcesses, existingProcesses };
};

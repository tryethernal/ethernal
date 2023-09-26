const { Op } = require('sequelize');
const { ProviderConnector } = require('../lib/rpc');
const logger = require('../lib/logger');
const { withTimeout } = require('../lib/utils');
const { RpcHealthCheck, Workspace } = require('../models');

module.exports = async job => {
    const healthChecks = await RpcHealthCheck.findAll({
        where: {
            failedAttempts: {
                [Op.gt]: 0
            }
        },
        include: {
            model: Workspace,
            as: 'workspace'
        }
    });

    for (let i = 0; i < healthChecks.length; i++) {
        const healthCheck = healthChecks[i];
        const provider = new ProviderConnector(healthCheck.workspace.rpcServer);
        try {
            const latestBlock = await withTimeout(provider.fetchLatestBlock());
            if (latestBlock)
                await healthCheck.resetFailedAttempts();
        } catch(error) {
            logger.error(error.message, { location: 'jobs.resetFailedRpcAttempts', error: error, data: { healthCheck }});
        }
    }
};

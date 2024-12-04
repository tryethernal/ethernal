const Sequelize = require('sequelize');
const models = require('../models');
const { enqueue } = require('../lib/queue');

module.exports = async job => {
    const workspaces = await models.Workspace.findAll({
        where: {
            integrityCheckStartBlockNumber: { [Sequelize.Op.not]: null },
            skipIntegrityCheck: false
        }
    });

    for (let i = 0; i < workspaces.length; i++) {
        const workspace = workspaces[i];
        await enqueue('integrityCheck', `integrityCheck-${workspace.id}`, { workspaceId: workspace.id });
    }

    return true;
};

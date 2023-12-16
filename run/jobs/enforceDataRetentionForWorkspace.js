const { Op } = require('sequelize');
const { enqueue } = require('../lib/queue');
const { Workspace } = require('../models');

module.exports = async () => {
    const workspaces = await Workspace.findAll({
        where: {
            dataRetentionLimit: {
                [Op.gt]: 0
            }
        }
    });

    for (let i = 0; i < workspaces.length; i++) {
        const workspace = workspaces[i];
        if (workspace.dataRetentionLimit > 0) {
            await enqueue('workspaceReset', `workspaceReset-${workspaces[i].id}`, {
                workspaceId: workspaces[i].id,
                from: new Date(0),
                to: new Date(new Date() - 60 * 60 * 24 * workspace.dataRetentionLimit * 1000)
            });
        }
    }

    return;
};

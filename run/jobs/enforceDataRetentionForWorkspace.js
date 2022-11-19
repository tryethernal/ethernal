const { Op } = require('sequelize');
const express = require('express');
const writeLog = require('../lib/writeLog');
const db = require('../lib/firebase');
const Workspace = db.Workspace;

module.exports = async job => {
    const workspaces = await Workspace.findAll({
        where: {
            dataRetentionLimit: {
                [Op.gt]: 0
            }
        }
    });

    for (let i = 0; i < workspaces.length; i++) {
        const workspace = workspaces[i];
        const user = await db.getUserById(workspace.userId);
        if (workspace.dataRetentionLimit > 0)
            await db.resetWorkspace(user.firebaseUserId, workspace.name, workspace.dataRetentionLimit);
    }

    return;
};

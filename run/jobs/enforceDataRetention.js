const { Op } = require('sequelize');
const express = require('express');
const db = require('../lib/firebase');
const taskAuthMiddleware = require('../middlewares/taskAuth');
const { enqueueTask } = require('../lib/tasks');
const Workspace = db.Workspace;

const router = express.Router();

router.post('/', taskAuthMiddleware, async (req, res) => {
    try {
        const workspaces = await Workspace.findAll({
            where: {
                dataRetentionLimit: {
                    [Op.gt]: 0
                }
            }
        });

        for (let i = 0; i < workspaces.length; i++) {
            await enqueueTask('enforceDataRetentionForWorkspace', {
                workspaceId: workspaces[i].id,
                secret: process.env.AUTH_SECRET
            });
        }

        res.sendStatus(200);
    } catch(error) {
        console.log(error);
        res.sendStatus(400);
    }
})

module.exports = router;

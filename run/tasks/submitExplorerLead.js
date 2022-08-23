const express = require('express');
const axios = require('axios');
const taskAuthMiddleware = require('../middlewares/taskAuth');
const moment = require('moment');

const router = express.Router();

router.post('/', taskAuthMiddleware, async (req, res) => {
    try {
        const data = req.body.data;
        if (!data.workspace || !data.email) {
            console.log(data);
            throw '[POST /tasks/submitExplorerLead] Missing parameter.';
        }

        const params = {
            workspace: data.workspace,
            email: data.email,
            createdAt: moment().format('yyyy-MM-DD HH:mm:ss')
        };

        await axios.post(process.env.EXPLORER_LEAD_SUBMISSION_ENDPOINT, params);

        res.sendStatus(200);
    } catch(error) {
        console.log(error);
        res.sendStatus(400);
    }
})

module.exports = router;

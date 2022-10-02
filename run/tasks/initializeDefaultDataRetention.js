const express = require('express');
const { User } = require('../models');
const taskAuthMiddleware = require('../middlewares/taskAuth');

const router = express.Router();

router.post('/', taskAuthMiddleware, async (req, res) => {
    try {
        const users = await User.findAll();
        
        for (let i = 0; i < users.length; i++)
            if (users[i].isPremium)
                await users[i].update({ defaultDataRetentionLimit: 0 });

        res.sendStatus(200);
    } catch(error) {
        console.log(error);
        res.sendStatus(400);
    }
})

module.exports = router;

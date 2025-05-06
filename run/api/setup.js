const express = require('express');
const router = express.Router();
const db = require('../lib/firebase');
const selfHostedMiddleware = require('../middlewares/selfHosted');
const { managedError, unmanagedError } = require('../lib/errors');

router.post('/admin', selfHostedMiddleware, async (req, res, next) => {
    const data = req.body.data;
    try {
        const canSetupAdmin = await db.canSetupAdmin();
        if (!canSetupAdmin)
            return managedError(new Error('Setup is not allowed'), req, res);

        try {
            const user = await db.createAdmin(data.email, data.password);
            res.status(200).json({ user });
        } catch (error) {
            managedError(error, req, res);
        }
    } catch(error) {
        unmanagedError(error, req, next);
    }
});

module.exports = router;

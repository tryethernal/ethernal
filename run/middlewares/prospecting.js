/**
 * @fileoverview Middleware that gates prospect API access.
 * Checks: (1) prospecting feature is enabled, (2) user is in admin whitelist.
 * @module middlewares/prospecting
 */
const { isProspectingEnabled } = require('../lib/flags');
const { getProspectAdminUserIds } = require('../lib/env');

module.exports = (req, res, next) => {
    if (!isProspectingEnabled())
        return res.status(404).send('Not found');

    const user = req.body.data?.user;
    if (!user)
        return res.status(401).send('Authentication required');

    const adminIds = (getProspectAdminUserIds() || '')
        .split(',')
        .map(id => parseInt(id.trim(), 10))
        .filter(Boolean);

    if (!adminIds.includes(user.id))
        return res.status(403).send('Access denied');

    next();
};

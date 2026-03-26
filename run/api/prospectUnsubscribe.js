/**
 * @fileoverview Public unsubscribe endpoint for prospect outreach emails.
 * Token-based, no authentication required. CAN-SPAM / GDPR compliance.
 * @module api/prospectUnsubscribe
 */
const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { Prospect, ProspectEvent } = require('../models');
const { getDripUnsubscribeSecret } = require('../lib/env');
const { isProspectingEnabled } = require('../lib/flags');
const logger = require('../lib/logger');

/**
 * Decrypt unsubscribe token to recover email address.
 * @param {string} token - URL-safe base64 token (IV.ciphertext)
 * @returns {string|null} Decrypted email or null on failure
 */
function decryptToken(token) {
    try {
        const [ivB64, encB64] = token.split('.');
        if (!ivB64 || !encB64) return null;

        const key = crypto.scryptSync(getDripUnsubscribeSecret(), 'ethernal-prospect', 32);
        const iv = Buffer.from(ivB64, 'base64url');
        const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
        let decrypted = decipher.update(encB64, 'base64url', 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted;
    } catch {
        return null;
    }
}

router.get('/unsubscribe', async (req, res) => {
    if (!isProspectingEnabled()) return res.status(404).send('Not found');

    const { token } = req.query;
    if (!token) return res.status(400).send('Missing token');

    const email = decryptToken(token);
    if (!email) return res.status(400).send('Invalid token');

    try {
        const prospects = await Prospect.findAll({
            where: {
                contactEmail: email,
                status: { [require('sequelize').Op.notIn]: ['rejected', 'no_reply'] }
            }
        });
        for (const prospect of prospects) {
            await prospect.update({ status: 'rejected' });
            await ProspectEvent.create({ prospectId: prospect.id, event: 'unsubscribed', metadata: { email } });
        }
        res.status(200).send('You have been unsubscribed. You will no longer receive emails from us.');
    } catch (error) {
        logger.error(error.message, { location: 'prospectUnsubscribe', error });
        res.status(200).send('You have been unsubscribed.');
    }
});

module.exports = router;

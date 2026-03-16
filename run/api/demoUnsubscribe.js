/**
 * @fileoverview Unsubscribe endpoint for demo drip emails.
 * Decrypts email from token and marks all pending drip emails as skipped.
 * @module api/demoUnsubscribe
 */

const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const db = require('../lib/firebase');
const { getDripUnsubscribeSecret } = require('../lib/env');
const logger = require('../lib/logger');

let _unsubscribeKey;

router.get('/unsubscribe', async (req, res) => {
    try {
        const { token } = req.query;
        if (!token)
            return res.status(400).send('Missing token');

        let email;
        try {
            const parts = token.split('.');
            if (parts.length !== 2) return res.status(400).send('Invalid token');
            const iv = Buffer.from(parts[0], 'base64url');
            if (!_unsubscribeKey)
                _unsubscribeKey = crypto.scryptSync(getDripUnsubscribeSecret(), 'ethernal-drip', 32);
            const decipher = crypto.createDecipheriv('aes-256-cbc', _unsubscribeKey, iv);
            email = decipher.update(parts[1], 'base64url', 'utf8');
            email += decipher.final('utf8');
        } catch {
            return res.status(400).send('Invalid token');
        }

        await db.skipDripEmailsForEmail(email);

        res.status(200).send(`
            <html><body style="background:#0f0f1a;color:#e0e0e0;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;">
            <div style="text-align:center;">
                <h2>You have been unsubscribed</h2>
                <p>You will no longer receive demo explorer emails.</p>
            </div>
            </body></html>
        `);
    } catch (error) {
        logger.error(error.message, { location: 'api.demoUnsubscribe', error });
        res.status(500).send('Something went wrong');
    }
});

module.exports = router;

/**
 * @fileoverview Mailjet webhook handler for tracking drip email opens and clicks.
 * Receives events from Mailjet and sends to PostHog.
 * @module webhooks/mailjet
 */

const crypto = require('crypto');
const express = require('express');
const router = express.Router();
const { getMailjetWebhookSecret } = require('../lib/env');
const Analytics = require('../lib/analytics');
const logger = require('../lib/logger');

router.post('/', async (req, res) => {
    try {
        const { token } = req.query;
        const secret = getMailjetWebhookSecret();
        if (!token || !secret || token.length !== secret.length ||
            !crypto.timingSafeEqual(Buffer.from(token), Buffer.from(secret)))
            return res.status(401).json({ message: 'Unauthorized' });

        const events = Array.isArray(req.body) ? req.body : [req.body];
        const analytics = new Analytics();
        let processed = 0;

        for (const event of events) {
            const { event: eventType, CustomID } = event;

            if (!CustomID || !eventType) continue;

            // CustomID format: "drip-step-{N}-explorer-{slug}"
            const match = CustomID.match(/^drip-step-(\d+)-explorer-(.+)$/);
            if (!match) continue;

            const step = parseInt(match[1], 10);
            const explorerSlug = match[2];

            if (eventType === 'open') {
                analytics.track(
                    `explorer:${explorerSlug}`,
                    'email:drip_opened',
                    { step, explorerSlug }
                );
                processed++;
            } else if (eventType === 'click') {
                analytics.track(
                    `explorer:${explorerSlug}`,
                    'email:drip_clicked',
                    { step, explorerSlug, url: event.url }
                );
                processed++;
            }
        }

        analytics.shutdown();
        res.status(200).json({ processed });
    } catch (error) {
        logger.error(error.message, { location: 'webhooks.mailjet', error });
        res.status(500).json({ message: 'Internal error' });
    }
});

module.exports = router;

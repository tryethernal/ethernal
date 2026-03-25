/**
 * @fileoverview Mailjet webhook handler for prospect email events (open, click, bounce).
 * Separate from drip email webhook. Uses CustomID prefix 'prospect-' for routing.
 * @module webhooks/mailjetProspects
 */
const crypto = require('crypto');
const express = require('express');
const router = express.Router();
const { Prospect } = require('../models');
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
        let processed = 0;

        for (const event of events) {
            const customId = event.CustomID || event.customID || '';
            if (!customId.startsWith('prospect-')) continue;

            // Extract prospect ID: prospect-{id}-fu{count}
            const match = customId.match(/^prospect-(\d+)/);
            if (!match) continue;

            const prospectId = parseInt(match[1], 10);
            const prospect = await Prospect.findByPk(prospectId);
            if (!prospect) continue;

            const eventType = (event.event || event.Event || '').toLowerCase();

            if (eventType === 'open' && !prospect.openedAt) {
                await prospect.update({ openedAt: new Date() });
                await prospect.logEvent('opened');
                const analytics = new Analytics();
                analytics.track(null, 'prospect:email_opened', { domain: prospect.domain });
                analytics.shutdown();
            } else if (eventType === 'click') {
                await prospect.logEvent('clicked', { url: event.url });
            } else if (eventType === 'bounce' && event.hard_bounce) {
                await prospect.update({ status: 'no_reply' });
                await prospect.logEvent('bounced', { error: event.error });
            }

            processed++;
        }

        res.status(200).json({ processed });
    } catch (error) {
        logger.error(error.message, { location: 'webhooks.mailjetProspects', error });
        res.status(500).json({ error: 'Internal error' });
    }
});

module.exports = router;

/**
 * @fileoverview Prospect management API endpoints.
 * All endpoints gated by authMiddleware + prospectingMiddleware.
 * @module api/prospects
 */
const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/auth');
const prospectingMiddleware = require('../middlewares/prospecting');
const { Prospect, ProspectEvent } = require('../models');
const { enqueue } = require('../lib/queue');
const { managedError, unmanagedError } = require('../lib/errors');

router.use(authMiddleware);
router.use(prospectingMiddleware);

/**
 * GET /api/prospects — List prospects with filters
 * Query params: status, chainType, signalSource, leadType, page, limit
 */
router.get('/', async (req, res, next) => {
    try {
        const { status, chainType, signalSource, leadType, page = 1, limit = 50 } = req.query;
        const where = {};

        if (status) where.status = status;
        if (chainType) where.chainType = chainType;
        if (signalSource) where.signalSource = signalSource;
        if (leadType) where.leadType = leadType;

        const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);
        const { rows, count } = await Prospect.findAndCountAll({
            where,
            order: [['confidenceScore', 'DESC'], ['createdAt', 'DESC']],
            limit: parseInt(limit, 10),
            offset,
            include: [{ association: 'demoProfile' }]
        });

        res.status(200).json({ prospects: rows, total: count, page: parseInt(page, 10) });
    } catch (error) {
        unmanagedError(error, req, next);
    }
});

/**
 * GET /api/prospects/stats — Dashboard counts
 */
router.get('/stats', async (req, res, next) => {
    try {
        const [byStatus, bySource, byLeadType] = await Promise.all([
            Prospect.findAll({
                attributes: ['status', [Prospect.sequelize.fn('COUNT', '*'), 'count']],
                group: ['status'],
                raw: true
            }),
            Prospect.findAll({
                attributes: ['signalSource', [Prospect.sequelize.fn('COUNT', '*'), 'count']],
                group: ['signalSource'],
                raw: true
            }),
            Prospect.findAll({
                attributes: ['leadType', [Prospect.sequelize.fn('COUNT', '*'), 'count']],
                group: ['leadType'],
                raw: true
            })
        ]);

        res.status(200).json({ byStatus, bySource, byLeadType });
    } catch (error) {
        unmanagedError(error, req, next);
    }
});

/**
 * GET /api/prospects/:id — Prospect detail with events
 */
router.get('/:id', async (req, res, next) => {
    try {
        const prospect = await Prospect.findByPk(req.params.id, {
            include: [
                { association: 'demoProfile' },
                { association: 'events', order: [['createdAt', 'DESC']] }
            ]
        });

        if (!prospect) return managedError(new Error('Prospect not found'), req, res);

        res.status(200).json(prospect);
    } catch (error) {
        unmanagedError(error, req, next);
    }
});

/**
 * PUT /api/prospects/:id — Update prospect (status, draft, contact)
 */
router.put('/:id', async (req, res, next) => {
    try {
        const prospect = await Prospect.findByPk(req.params.id);
        if (!prospect) return managedError(new Error('Prospect not found'), req, res);

        const allowed = ['status', 'contactName', 'contactEmail', 'contactLinkedin', 'emailSubject', 'emailBody'];
        const updates = {};
        for (const key of allowed) {
            if (req.body[key] !== undefined) updates[key] = req.body[key];
        }

        await prospect.update(updates);

        if (updates.status) {
            await prospect.logEvent(updates.status, { updatedBy: req.body.data.user.id });
        }

        res.status(200).json(prospect);
    } catch (error) {
        unmanagedError(error, req, next);
    }
});

/**
 * POST /api/prospects/:id/send — Approve and send prospect email
 */
router.post('/:id/send', async (req, res, next) => {
    try {
        const prospect = await Prospect.findByPk(req.params.id);
        if (!prospect) return managedError(new Error('Prospect not found'), req, res);

        if (prospect.status !== 'draft_ready' && prospect.status !== 'approved')
            return managedError(new Error('Prospect must be in draft_ready status to send'), req, res);

        if (!prospect.contactEmail)
            return managedError(new Error('Prospect has no contact email'), req, res);

        if (!prospect.emailSubject || !prospect.emailBody)
            return managedError(new Error('Prospect has no email draft'), req, res);

        await prospect.update({ status: 'approved' });
        await prospect.logEvent('approved', { approvedBy: req.body.data.user.id });

        await enqueue('sendProspectEmail', `sendProspectEmail-${prospect.id}`, {
            prospectId: prospect.id
        });

        res.status(200).json({ message: 'Email queued for sending' });
    } catch (error) {
        unmanagedError(error, req, next);
    }
});

module.exports = router;

/**
 * @fileoverview GitHub Actions webhook endpoint.
 * Receives pipeline status updates from sentry-auto-fix and sentry-scanner workflows.
 * Upserts SentryPipelineRun records and triggers Pusher events for the dashboard.
 *
 * @module webhooks/githubActions
 * @route POST / - Receive pipeline status update
 */

const express = require('express');
const router = express.Router();
const { SentryPipelineRun } = require('../models');
const { trigger } = require('../lib/pusher');
const { isPusherEnabled } = require('../lib/flags');
const githubActionsWebhookMiddleware = require('../middlewares/githubActionsWebhook');
const logger = require('../lib/logger');

router.post('/', githubActionsWebhookMiddleware, async (req, res) => {
    try {
        const {
            workflowRunId,
            githubIssueNumber,
            sentryIssueId,
            sentryProject,
            sentryTitle,
            sentryLevel,
            sentryEventCount,
            sentryLink,
            githubPrNumber,
            status,
            currentStep,
            triageDecision,
            triageReason,
            fixSummary,
            conversationLog,
            duration,
            completedAt
        } = req.body;

        // Find existing run by workflowRunId or githubIssueNumber
        let run;
        if (workflowRunId) {
            run = await SentryPipelineRun.findOne({ where: { workflowRunId } });
        }
        if (!run && githubIssueNumber != null && githubIssueNumber !== 0) {
            run = await SentryPipelineRun.findOne({ where: { githubIssueNumber } });
        }

        // Build update payload, only including provided fields
        const updateData = {};
        if (workflowRunId !== undefined) updateData.workflowRunId = workflowRunId;
        if (githubIssueNumber !== undefined) updateData.githubIssueNumber = githubIssueNumber;
        if (sentryIssueId !== undefined) updateData.sentryIssueId = sentryIssueId;
        if (sentryProject !== undefined) updateData.sentryProject = sentryProject;
        if (sentryTitle !== undefined) updateData.sentryTitle = sentryTitle;
        if (sentryLevel !== undefined) updateData.sentryLevel = sentryLevel;
        if (sentryEventCount !== undefined) updateData.sentryEventCount = sentryEventCount;
        if (sentryLink !== undefined) updateData.sentryLink = sentryLink;
        if (githubPrNumber !== undefined) updateData.githubPrNumber = githubPrNumber;
        if (status !== undefined) updateData.status = status;
        if (currentStep !== undefined) updateData.currentStep = currentStep;
        if (triageDecision !== undefined) updateData.triageDecision = triageDecision;
        if (triageReason !== undefined) updateData.triageReason = triageReason;
        if (fixSummary !== undefined) updateData.fixSummary = fixSummary;
        if (conversationLog !== undefined) updateData.conversationLog = conversationLog;
        if (duration !== undefined) updateData.duration = duration;
        if (completedAt !== undefined) updateData.completedAt = completedAt;

        if (run) {
            await run.update(updateData);
        } else {
            run = await SentryPipelineRun.create(updateData);
        }

        // Notify dashboard via Pusher
        if (isPusherEnabled()) {
            trigger(`private-sentry-pipeline`, 'updated', {
                id: run.id,
                status: run.status,
                currentStep: run.currentStep,
                sentryTitle: run.sentryTitle
            });
        }

        res.status(200).json({ id: run.id, status: run.status });
    } catch (error) {
        logger.error(error.message, { location: 'webhooks.githubActions', error });
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;

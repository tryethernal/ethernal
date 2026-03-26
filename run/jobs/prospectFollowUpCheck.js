/**
 * @fileoverview Checks if a prospect replied after 5 days.
 * If not, drafts a follow-up email and moves prospect back to draft_ready.
 * @module jobs/prospectFollowUpCheck
 */
const { Prospect } = require('../models');
const { draftEmail } = require('../lib/prospectEmail');
const { isProspectingEnabled } = require('../lib/flags');
const logger = require('../lib/logger');

/**
 * @param {Object} job
 * @param {number} job.data.prospectId
 */
module.exports = async (job) => {
    if (!isProspectingEnabled()) return;

    const { prospectId } = job.data;
    const prospect = await Prospect.findByPk(prospectId, {
        include: [{ association: 'demoProfile' }]
    });

    if (!prospect) return;

    // If they replied, unsubscribed, or were rejected — skip
    if (['replied', 'rejected', 'no_reply'].includes(prospect.status)) return;

    // If they already replied since the email was sent
    if (prospect.repliedAt) return;

    // Max 2 follow-ups
    if (prospect.followUpCount >= 2) {
        await prospect.update({ status: 'no_reply' });
        await prospect.logEvent('no_reply', { afterFollowUps: prospect.followUpCount });
        return;
    }

    const newFollowUpCount = prospect.followUpCount + 1;

    const demoData = prospect.demoProfile ? {
        blockCount: prospect.demoProfile.blockCount,
        transactionCount: prospect.demoProfile.transactionCount,
        contractCount: prospect.demoProfile.contractCount,
        chainName: prospect.demoProfile.chainName
    } : null;

    const emailDraft = await draftEmail({
        companyName: prospect.companyName || prospect.domain,
        contactName: prospect.contactName,
        chainName: prospect.chainName,
        chainType: prospect.chainType,
        launchStatus: prospect.launchStatus,
        research: prospect.research || '',
        leadType: prospect.leadType,
        demoData,
        isFollowUp: true,
        followUpCount: newFollowUpCount
    });

    const updateData = {
        status: 'draft_ready',
        followUpCount: newFollowUpCount
    };
    if (emailDraft) {
        updateData.emailSubject = emailDraft.subject;
        updateData.emailBody = emailDraft.body;
    }

    await prospect.update(updateData);
    await prospect.logEvent('follow_up_drafted', { followUpCount: newFollowUpCount });

    logger.info('Follow-up drafted', { prospectId, followUpCount: newFollowUpCount });
};

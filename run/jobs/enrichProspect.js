/**
 * @fileoverview Enriches a detected prospect: researches company, finds contacts,
 * drafts personalized email. Moves prospect to draft_ready on completion.
 * @module jobs/enrichProspect
 */
const { Prospect } = require('../models');
const { searchCompany } = require('../lib/enrichment');
const { findContact } = require('../lib/apollo');
const { draftEmail } = require('../lib/prospectEmail');
const { isProspectingEnabled } = require('../lib/flags');
const Analytics = require('../lib/analytics');
const logger = require('../lib/logger');

/**
 * @param {Object} job - BullMQ job
 * @param {number} job.data.prospectId - Prospect ID to enrich
 */
module.exports = async (job) => {
    if (!isProspectingEnabled()) return;

    const { prospectId } = job.data;
    const prospect = await Prospect.findByPk(prospectId, {
        include: [{ association: 'demoProfile' }]
    });

    if (!prospect) throw new Error('Prospect not found');
    if (prospect.status !== 'detected') return;

    // Step 1: Company research
    let research = null;
    if (prospect.domain) {
        research = await searchCompany(prospect.domain);
    }
    if (research) {
        await prospect.update({ research });
    }

    // Step 2: Contact finding
    if (prospect.domain) {
        const contact = await findContact(prospect.domain);
        if (contact) {
            await prospect.update({
                contactName: contact.name,
                contactEmail: contact.email,
                contactLinkedin: contact.linkedin
            });
        }
    }

    // Step 3: Email drafting
    await prospect.reload();
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
        research: prospect.research || 'No research available.',
        leadType: prospect.leadType,
        demoData
    });

    const updateData = { status: 'draft_ready' };
    if (emailDraft) {
        updateData.emailSubject = emailDraft.subject;
        updateData.emailBody = emailDraft.body;
    }
    await prospect.update(updateData);

    await prospect.logEvent('email_drafted', {
        hasContact: !!prospect.contactEmail,
        hasResearch: !!prospect.research,
        hasDraft: !!emailDraft
    });

    const analytics = new Analytics();
    analytics.track(null, 'prospect:enriched', {
        domain: prospect.domain,
        hasContact: !!prospect.contactEmail,
        hasResearch: !!prospect.research
    });
    analytics.shutdown();

    logger.info('Prospect enriched', { prospectId, domain: prospect.domain, status: 'draft_ready' });
};

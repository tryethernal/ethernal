/**
 * @fileoverview Enriches a demo explorer with company research and personalized email copy.
 * Called async at demo creation time. Results stored on explorer.enrichment column.
 * @module jobs/enrichDemoProfile
 */

const { Explorer } = require('../models');
const { Op } = require('sequelize');
const { resolveDomain, searchCompany, generateSnippets } = require('../lib/enrichment');
const { getLinkupApiKey, getClaudeApiKey } = require('../lib/env');
const logger = require('../lib/logger');

const CACHE_DAYS = 7;

/**
 * @param {Object} job - BullMQ job
 * @param {number} job.data.explorerId - Explorer to enrich
 * @param {string} job.data.email - Demo creator's email
 * @param {string|null} job.data.rpcServer - RPC URL used for the demo
 * @param {string|null} job.data.networkId - Chain network ID
 */
module.exports = async (job) => {
    const { explorerId, email, rpcServer, networkId } = job.data;

    if (!getLinkupApiKey() || !getClaudeApiKey()) {
        logger.info('Enrichment skipped: missing LINKUP_API_KEY or CLAUDE_API_KEY');
        return;
    }

    const explorer = await Explorer.findByPk(explorerId);
    if (!explorer) return;

    const resolved = resolveDomain(email, rpcServer);
    if (!resolved) return;

    const { domain, source } = resolved;

    // Check domain cache — reuse enrichment from same domain within 7 days
    const { sequelize } = Explorer;
    const cached = await Explorer.findOne({
        where: {
            id: { [Op.ne]: explorerId },
            [Op.and]: [
                sequelize.literal(`enrichment->>'companyDomain' = ${sequelize.escape(domain)}`),
                sequelize.literal(`enrichment->>'error' IS NULL`),
                sequelize.literal(`(enrichment->>'enrichedAt')::timestamptz > NOW() - INTERVAL '${CACHE_DAYS} days'`)
            ]
        },
        order: [['createdAt', 'DESC']]
    });

    if (cached?.enrichment) {
        await explorer.update({ enrichment: cached.enrichment });
        return;
    }

    // Search with linkup.so
    const research = await searchCompany(domain);
    if (!research) {
        await explorer.update({
            enrichment: { companyDomain: domain, source, error: 'linkup_failed', enrichedAt: new Date().toISOString() }
        });
        return;
    }

    // Generate snippets with Claude
    const snippets = await generateSnippets(research, domain, networkId);
    if (!snippets) {
        await explorer.update({
            enrichment: { companyDomain: domain, source, error: 'generation_failed', enrichedAt: new Date().toISOString() }
        });
        return;
    }

    await explorer.update({
        enrichment: {
            ...snippets,
            companyDomain: domain,
            source,
            enrichedAt: new Date().toISOString()
        }
    });
};

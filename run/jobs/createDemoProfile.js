/**
 * @fileoverview Creates a demo profile record on demo explorer creation.
 * Captures email, resolved domain, RPC, chain info for later prospect matching.
 * @module jobs/createDemoProfile
 */
const { DemoProfile } = require('../models');
const { resolveDomain } = require('../lib/enrichment');
const logger = require('../lib/logger');

/**
 * @param {Object} job - BullMQ job
 * @param {string} job.data.email - Demo creator's email
 * @param {string|null} job.data.rpcServer - RPC URL
 * @param {string} job.data.chainName - Explorer/chain name
 * @param {string|null} job.data.networkId - Chain network ID
 * @param {string} [job.data.explorerCreatedAt] - Explorer creation timestamp
 */
module.exports = async (job) => {
    const { email, rpcServer, chainName, networkId, explorerCreatedAt } = job.data;

    if (!email) throw new Error('Missing email for demo profile creation');

    const resolved = resolveDomain(email, rpcServer);

    await DemoProfile.create({
        email,
        domain: resolved?.domain || null,
        rpcServer: rpcServer || null,
        chainName: chainName || null,
        networkId: networkId || null,
        explorerCreatedAt: explorerCreatedAt || new Date()
    });

    logger.info('Demo profile created', { email, domain: resolved?.domain, chainName });
};

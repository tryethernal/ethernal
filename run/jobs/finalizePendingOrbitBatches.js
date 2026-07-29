/**
 * @fileoverview Orbit batch finalization job.
 * Confirms pending batches once parent chain reaches safe block.
 *
 * Runs every 30 seconds across every L1 parent chain, so it is unusually
 * exposed to a single unreachable RPC: before this was isolated, one dead
 * parent endpoint both stopped every *other* chain's batches from being
 * finalized and reported an error on every tick — 5,352 Sentry events in ten
 * hours, more than the whole monthly error allowance.
 *
 * @module jobs/finalizePendingOrbitBatches
 */

const crypto = require('crypto');
const logger = require('../lib/logger');
const redis = require('../lib/redis');
const { withTimeout } = require('../lib/utils');
const { OrbitBatch, Workspace } = require('../models');
const { Op } = require('sequelize');

const RPC_TIMEOUT = 15000;
const DB_TIMEOUT = 10000;

/**
 * How long to stay quiet about an unchanged set of failing parent chains.
 * The job still fails, and still logs, on every tick — this only throttles
 * what reaches Sentry.
 */
const FAILURE_REPORT_TTL = 3600;

/**
 * Reduces a failure to what makes it distinct, so the same fault recurring on
 * every tick hashes identically while a genuinely different one does not.
 *
 * Volatile detail is collapsed — digits and hex become '#' — because messages
 * carry block numbers, hashes and durations that would otherwise make every
 * tick look novel and defeat the throttle entirely.
 *
 * @param {{ workspaceId: number, message: string }} failure
 * @returns {string} Stable signature for this workspace-and-fault pairing.
 */
const failureSignature = ({ workspaceId, message }) =>
    `${workspaceId}:${String(message)
        .toLowerCase()
        .replace(/0x[0-9a-f]+/g, '#')
        .replace(/\d+/g, '#')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 120)}`;

/**
 * True at most once an hour for a given set of failures.
 *
 * Keyed on which chains failed *and how*, rather than on the job. A chain that
 * starts failing is reported immediately instead of being swallowed by a window
 * another chain opened, and a chain whose RPC recovers only to hit a database
 * error is reported too — that is a different, independently actionable fault
 * that happens to share a workspace id. The same fault repeating stays quiet.
 *
 * On Redis failure this returns true — a missing throttle should not cost us
 * the signal.
 *
 * @param {Array<{ workspaceId: number, message: string }>} failures
 * @returns {Promise<boolean>} Whether this failure should reach Sentry.
 */
const shouldReportFailures = async failures => {
    const workspaceIds = failures.map(failure => failure.workspaceId).sort((a, b) => a - b);
    const digest = crypto
        .createHash('sha1')
        .update(failures.map(failureSignature).sort().join('|'))
        .digest('hex')
        .slice(0, 12);

    // Ids stay readable in the key so a glance at Redis still says which chains
    // are affected; the digest is what makes distinct faults distinct.
    const key = `orbitBatchFinalization:rpcFailure:${workspaceIds.join(',')}:${digest}`;
    try {
        return await redis.set(key, '1', 'NX', 'EX', FAILURE_REPORT_TTL) === 'OK';
    } catch (error) {
        logger.warn('Could not throttle Orbit RPC failure report', {
            location: 'jobs.finalizePendingOrbitBatches',
            error: error.message
        });
        return true;
    }
};

module.exports = async () => {

    // Find all L1 parent workspaces (both public and custom)
    const workspaces = await Workspace.findAll({
        where: {
            [Op.or]: [
                { isTopL1Parent: true },
                { isCustomL1Parent: true }
            ]
        },
        include: ['orbitChildConfigs']
    });

    let allPendingBatches = [];
    const failures = [];

    for (const workspace of workspaces) {
        // Each parent chain is finalized independently. A chain we cannot
        // reach must not cost the others their sweep.
        try {
            if (!workspace.rpcServer) {
                logger.warn(`Skipping parent workspace ${workspace.id}: no RPC server configured`, {
                    location: 'jobs.finalizePendingOrbitBatches',
                    workspaceId: workspace.id
                });
                continue;
            }

            const client = workspace.getViemPublicClient();
            const block = await withTimeout(client.getBlock({ blockTag: 'safe' }), RPC_TIMEOUT);

            for (const orbitChildConfig of workspace.orbitChildConfigs) {
                logger.info(`Validating batches posted on ${workspace.name} by config ${orbitChildConfig.workspaceId} with block number ${block.number}`);
                const pendingBatches = await withTimeout(OrbitBatch.findAll({
                    where: {
                        workspaceId: orbitChildConfig.workspaceId,
                        confirmationStatus: 'pending',
                        parentChainBlockNumber: {
                            [Op.lt]: Number(block.number)
                        }
                    }
                }), DB_TIMEOUT);

                for (const batch of pendingBatches) {
                    await batch.confirm();
                }

                allPendingBatches = allPendingBatches.concat(pendingBatches);
            }
        } catch (error) {
            failures.push({
                workspaceId: workspace.id,
                name: workspace.name,
                message: error.message
            });
            logger.error(`Could not finalize Orbit batches on ${workspace.name}: ${error.message}`, {
                location: 'jobs.finalizePendingOrbitBatches',
                workspaceId: workspace.id,
                error
            });
        }
    }

    if (failures.length) {
        // Fail loudly in the queue every time, but reach Sentry at most hourly.
        // The worker's failure handler captures this, and instrument.js drops
        // anything flagged sentryIgnore.
        //
        // Deliberately not routed through reportRpcFailure: the workspace here
        // is the *parent* chain, whose own blockSync already reports its RPC
        // failures. Counting them twice would trip the explorer auto-disable
        // threshold at double speed, and disable a parent explorer over a child
        // chain's finalization sweep.
        const summary = failures
            .map(failure => `${failure.name} (#${failure.workspaceId}): ${failure.message}`)
            .join('; ');
        const error = new Error(`Could not finalize Orbit batches for ${failures.length} of ${workspaces.length} parent chain(s) — ${summary}`);
        error.sentryIgnore = !await shouldReportFailures(failures);
        throw error;
    }

    return allPendingBatches.map(batch => batch.id);
};

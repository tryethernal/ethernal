/**
 * @fileoverview Orbit deposit storage job.
 * Stores L1→L2 deposit records from bridge events.
 * @module jobs/storeOrbitDeposit
 */

const { OrbitDeposit } = require('../models');

module.exports = async (job) => {
    const {
        workspaceId,
        l1Block,
        l1TransactionHash,
        messageIndex,
        sender,
        timestamp
    } = job.data;

    return OrbitDeposit.create({
        workspaceId,
        l1Block,
        l1TransactionHash,
        messageIndex,
        sender,
        timestamp
    });
}

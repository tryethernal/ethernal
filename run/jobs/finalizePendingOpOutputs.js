/**
 * @fileoverview OP output finalization job.
 * Finalizes proposed outputs once their challenge period has elapsed.
 * Uses bulk UPDATE instead of individual updates for efficiency.
 * @module jobs/finalizePendingOpOutputs
 */

const { Op } = require('sequelize');
const { OpOutput } = require('../models');
const logger = require('../lib/logger');
module.exports = async job => {
    try {
        const now = new Date();

        const [finalizedCount] = await OpOutput.update(
            { status: 'finalized' },
            {
                where: {
                    status: 'proposed',
                    challengePeriodEnds: {
                        [Op.lt]: now
                    }
                }
            }
        );

        if (finalizedCount === 0)
            return 'No outputs to finalize';

        logger.info(`Finalized ${finalizedCount} OP outputs`);
        return `Finalized ${finalizedCount} OP outputs`;
    } catch (error) {
        logger.error(`Error in finalizePendingOpOutputs job: ${error.message}`, {
            location: 'jobs.finalizePendingOpOutputs',
            error
        });
        throw error;
    }
};

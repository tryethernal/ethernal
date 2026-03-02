const { Op } = require('sequelize');
const { OpOutput } = require('../models');
const logger = require('../lib/logger');

/**
 * Background job to finalize pending OP outputs after their challenge period ends.
 * This job runs periodically and checks for outputs that have passed their challenge period.
 */
module.exports = async job => {
    try {
        const now = new Date();

        // Find all proposed outputs where challenge period has ended
        const outputsToFinalize = await OpOutput.findAll({
            where: {
                status: 'proposed',
                challengePeriodEnds: {
                    [Op.lt]: now
                }
            }
        });

        if (outputsToFinalize.length === 0) {
            return 'No outputs to finalize';
        }

        let finalizedCount = 0;
        for (const output of outputsToFinalize) {
            try {
                await output.update({ status: 'finalized' });
                finalizedCount++;
                logger.info(`Finalized OP output ${output.outputIndex} for workspace ${output.workspaceId}`);
            } catch (error) {
                logger.error(`Error finalizing OP output ${output.id}: ${error.message}`, {
                    location: 'jobs.finalizePendingOpOutputs',
                    error,
                    outputId: output.id
                });
            }
        }

        return `Finalized ${finalizedCount} OP outputs`;
    } catch (error) {
        logger.error(`Error in finalizePendingOpOutputs job: ${error.message}`, {
            location: 'jobs.finalizePendingOpOutputs',
            error
        });
        throw error;
    }
};

/**
 * @fileoverview OpsGenie alerting integration.
 * Creates incidents for critical errors and system events.
 * @module lib/opsgenie
 */

const { getNodeEnv, getOpsgenieApiKey } = require('./env');
const logger = require('./logger');
const axios = require('axios');

/**
 * Creates an alert/incident in OpsGenie.
 * In development mode or without API key, logs the incident instead.
 * @param {string} message - Short alert message/title
 * @param {string} description - Detailed description of the incident
 * @param {string} [priority='P1'] - Priority level (P1-P5, P1 being highest)
 * @param {Object} [options] - Additional options
 * @param {string} [options.alias] - Deduplication key. If set, OpsGenie will count subsequent alerts
 *   with the same alias as the same incident instead of creating new ones.
 * @returns {Promise<Object>|undefined} Axios response or undefined in dev mode
 */
const createIncident = (message, description, priority = 'P1', options = {}) => {
    if (getNodeEnv() === 'development' || !getOpsgenieApiKey()) {
        logger.info('Development environment (no OpsGenie API key) - skipping OpsGenie incident creation');
        return logger.info({ message, description, priority });
    }

    const data = {
        message,
        description,
        priority,
        tags: ['api']
    };

    if (options.alias)
        data.alias = options.alias;

    return axios({
        method: 'POST',
        url: 'https://api.opsgenie.com/v2/alerts',
        headers: {
            'Authorization': `GenieKey ${getOpsgenieApiKey()}`,
        },
        data
    });
};

module.exports = {
    createIncident
};

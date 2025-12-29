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
 * @returns {Promise<Object>|undefined} Axios response or undefined in dev mode
 */
const createIncident = (message, description, priority = 'P1') => {
    if (getNodeEnv() === 'development' || !getOpsgenieApiKey()) {
        logger.info('Development environment (no OpsGenie API key) - skipping OpsGenie incident creation');
        return logger.info({ message, description, priority });
    }

    return axios({
        method: 'POST',
        url: 'https://api.opsgenie.com/v2/alerts',
        headers: {
            'Authorization': `GenieKey ${getOpsgenieApiKey()}`,
        },
        data: {
            message,
            description,
            priority,
            tags: ['api']
        }
    });
};

module.exports = {
    createIncident
};

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
const createIncident = async (message, description, priority = 'P1', options = {}) => {
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

    try {
        return await axios({
            method: 'POST',
            url: 'https://api.opsgenie.com/v2/alerts',
            headers: {
                'Authorization': `GenieKey ${getOpsgenieApiKey()}`,
            },
            data
        });
    } catch (error) {
        logger.error('Failed to create OpsGenie incident', {
            error: error.message,
            status: error.response?.status,
            statusText: error.response?.statusText,
            message,
            description,
            priority,
            alias: options.alias
        });
        // Return undefined to indicate failure, but don't throw to prevent job failure
        return undefined;
    }
};

/**
 * Closes an OpsGenie alert by alias. Idempotent: closing an already-closed
 * or non-existent alert is a no-op (OpsGenie returns 202 either way).
 * Logs in dev mode instead of calling the API.
 * @param {string} alias - Dedup alias of the alert to close
 * @param {Object} [options]
 * @param {string} [options.note] - Optional note to attach on close
 * @returns {Promise<Object>|undefined} Axios response or undefined in dev/error mode
 */
const closeIncident = async (alias, options = {}) => {
    if (getNodeEnv() === 'development' || !getOpsgenieApiKey()) {
        logger.info('Development environment (no OpsGenie API key) - skipping OpsGenie close', { alias });
        return;
    }

    try {
        return await axios({
            method: 'POST',
            url: `https://api.opsgenie.com/v2/alerts/${encodeURIComponent(alias)}/close?identifierType=alias`,
            headers: {
                'Authorization': `GenieKey ${getOpsgenieApiKey()}`,
            },
            data: options.note ? { note: options.note, source: 'queueMonitoring' } : { source: 'queueMonitoring' }
        });
    } catch (error) {
        logger.error('Failed to close OpsGenie incident', {
            error: error.message,
            status: error.response?.status,
            statusText: error.response?.statusText,
            alias
        });
        return undefined;
    }
};

module.exports = {
    createIncident,
    closeIncident
};

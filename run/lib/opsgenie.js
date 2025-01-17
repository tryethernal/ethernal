const { getNodeEnv, getOpsgenieApiKey } = require('./env');
const logger = require('./logger');
const axios = require('axios');

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

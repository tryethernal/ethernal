/**
 * @fileoverview Approximated.app DNS record job.
 * Manages custom domain DNS records via Approximated.app integration.
 * @module jobs/updateApproximatedRecord
 */

const axios = require('axios');
const models = require('../models');
const { isApproximatedEnabled } = require('../lib/flags');

module.exports = async job => {
    const data = job.data;

    if (!isApproximatedEnabled())
        return 'Approximated integration is not enabled.';

    if (!data.explorerDomain)
        return 'Missing parameter.';

    const existingExplorerDomain = await models.ExplorerDomain.findByPk(data.explorerDomain.id);

    const headers = {
        'api-key': process.env.APPROXIMATED_API_KEY
    };

    if (existingExplorerDomain) {
        try {
            const payload = {
                incoming_address: data.explorerDomain.domain,
                target_address: process.env.APPROXIMATED_TARGET_IP
            };
            await axios.post(`https://cloud.approximated.app/api/vhosts`, payload, { headers });

            return 'Host created.';
        } catch(error) {
            console.log(error)
            return 'Host already exists.';
        }
    }
    else {
        try {
            await axios.delete(`https://cloud.approximated.app/api/vhosts/by/incoming/${data.explorerDomain.domain}`, { headers });

            return 'Host deleted.';
        } catch(error) {
            console.log(error)
            return 'Host has already been deleted.';
        }
    }
};

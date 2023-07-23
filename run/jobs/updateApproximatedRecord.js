/*
    Ethernal uses approximated.app to manage allow custom domains for public explorers users.
    If you want to manage DNS records inapp, you can signup there, create a cluster,
    register a domain name in the explorer settings and point the domain to your cluster address.
*/

const axios = require('axios');
const models = require('../models');

module.exports = async job => {
    const data = job.data;

    if (!process.env.APPROXIMATED_API_KEY || !process.env.APPROXIMATED_TARGET_IP)
        return 'Approximated integration is not enabled';

    if (!data.explorerDomain)
        return 'Missing parameter';

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

            return 'Host created';
        } catch(error) {
            console.log(error)
            return 'Host already exists';
        }
    }
    else {
        try {
            await axios.delete(`https://cloud.approximated.app/api/vhosts/by/incoming/${data.explorerDomain.domain}`, { headers });

            return 'Host deleted';
        } catch(error) {
            console.log(error)
            return 'Host has already been deleted';
        }
    }
};

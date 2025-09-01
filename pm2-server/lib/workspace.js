const axios = require('axios');
const { getEthernalSecret, getApiHost } = require('./env');

const secret = getEthernalSecret();
const apiHost = getApiHost();

if (!secret) {
    console.log(`Pass the secret with the ETHERNAL_SECRET env variable.`);
    process.exit(1);
}

const getWorkspace = async (workspaceId) => {
    const { data: workspace } = await axios.get(`${apiHost}/api/workspaces/${workspaceId}`, { params: { secret } });
    return { workspace };
};

module.exports = {
    getWorkspace
}
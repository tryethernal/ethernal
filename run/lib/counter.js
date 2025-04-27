const axios = require('axios');
const { getCounterNamespace } = require('./env');

module.exports = {
    async countUp(key) {
        const response = await axios.get(`https://api.counterapi.dev/v1/${getCounterNamespace()}/${key}/up`);
        return response.data.count;
    },
};

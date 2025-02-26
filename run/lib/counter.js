const axios = require('axios');
const { getCounterNamespace } = require('./env');

module.exports = {
    countUp(key) {
        return axios.get(`https://api.counterapi.dev/v1/${getCounterNamespace()}/${key}/up`);
    },
    async getCount(key) {
        try {
            const response = await axios.get(`https://api.counterapi.dev/v1/${getCounterNamespace()}/${key}/`);
            return response.data.count;
        } catch(error) {
            return 0;
        }
    }
};

const axios = require('axios');

module.exports = async (job) => {
    const { content, channel } = job.data;

    await axios.post(channel, { content });

    return { channel, content };
};

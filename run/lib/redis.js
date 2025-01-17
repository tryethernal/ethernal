const { getRedisUrl, getRedisFamily } = require('./env');
const Redis = require('ioredis');

module.exports = new Redis(getRedisUrl(), {
    maxRetriesPerRequest: null,
    family: getRedisFamily() || 4,
});
